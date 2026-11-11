import prisma from "../../db.js";
import { MAX_SEATS_PER_BOOKING } from "./bookingService.js";

// How long a seat stays held without being booked.
export const LOCK_TTL_MS = 5 * 60 * 1000;

const isPositiveInt = (n) => Number.isInteger(n) && n > 0;

/** Seats currently held (not expired) on a trip. */
export async function getLockedSeats(tripId) {
  const locks = await prisma.seatLock.findMany({
    where: { tripId, expiresAt: { gt: new Date() } },
    select: { seatNumber: true },
  });
  return locks.map((l) => l.seatNumber);
}

/**
 * Try to hold a seat for a user. Returns true if the lock was taken.
 * The unique (tripId, seatNumber) index makes this safe across concurrent
 * requests and across multiple backend instances.
 */
export async function lockSeat({ tripId, seat, userId, socketId }) {
  if (!isPositiveInt(tripId) || !isPositiveInt(seat) || !userId) return false;

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { bus: { select: { totalSeats: true } } },
  });
  if (!trip || seat > trip.bus.totalSeats) return false;

  const booked = await prisma.bookedSeat.findUnique({
    where: { tripId_seatNumber: { tripId, seatNumber: seat } },
  });
  if (booked) return false;

  try {
    return await prisma.$transaction(async (tx) => {
      // Serialize lock attempts per (trip, user) so concurrent requests can't
      // all pass the per-user cap check before any of them is saved.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${tripId}::int, ${userId}::int)`;

      const now = new Date();
      const held = await tx.seatLock.count({
        where: { tripId, userId, expiresAt: { gt: now } },
      });
      if (held >= MAX_SEATS_PER_BOOKING) return false;

      // An expired hold on this seat no longer counts.
      await tx.seatLock.deleteMany({
        where: { tripId, seatNumber: seat, expiresAt: { lte: now } },
      });
      await tx.seatLock.create({
        data: {
          tripId,
          seatNumber: seat,
          userId,
          socketId,
          expiresAt: new Date(now.getTime() + LOCK_TTL_MS),
        },
      });
      return true;
    });
  } catch (err) {
    if (err.code === "P2002") return false; // someone else holds it
    throw err;
  }
}

/** Release a seat, but only if this socket holds it. */
export async function unlockSeat({ tripId, seat, socketId }) {
  if (!isPositiveInt(tripId) || !isPositiveInt(seat)) return false;
  const { count } = await prisma.seatLock.deleteMany({
    where: { tripId, seatNumber: seat, socketId },
  });
  return count > 0;
}

/** Release every seat held by a socket (on disconnect). */
export async function releaseSocketLocks(socketId) {
  return deleteAndReturn({ socketId });
}

/** Remove expired holds so other clients can be told the seats are free. */
export async function sweepExpiredLocks() {
  return deleteAndReturn({ expiresAt: { lte: new Date() } });
}

async function deleteAndReturn(where) {
  const locks = await prisma.seatLock.findMany({
    where,
    select: { id: true, tripId: true, seatNumber: true },
  });
  if (locks.length === 0) return [];
  await prisma.seatLock.deleteMany({
    where: { id: { in: locks.map((l) => l.id) } },
  });
  return locks.map(({ tripId, seatNumber }) => ({ tripId, seatNumber }));
}
