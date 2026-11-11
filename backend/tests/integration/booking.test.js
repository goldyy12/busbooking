import { describe, it, expect, beforeEach, afterAll } from "vitest";
import prisma from "../../db.js";
import { bookTripCore } from "../../src/services/bookingService.js";
import {
  lockSeat,
  unlockSeat,
  getLockedSeats,
  releaseSocketLocks,
  sweepExpiredLocks,
} from "../../src/services/seatLockService.js";
import { getBookingById } from "../../src/controllers/bookingController.js";

if (!/test/i.test(process.env.DATABASE_URL || "")) {
  throw new Error(
    "Refusing to run: DATABASE_URL must point at a test database (name containing 'test').",
  );
}

let trip, alice, bob;

const reset = async () => {
  await prisma.seatLock.deleteMany();
  await prisma.bookedSeat.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.user.deleteMany();
};

beforeEach(async () => {
  await reset();
  const bus = await prisma.bus.create({
    data: { busNumber: "B-1", totalSeats: 10 },
  });
  trip = await prisma.trip.create({
    data: {
      from: "Ferizaj",
      to: "Prishtina",
      date: new Date("2030-01-02T08:00:00Z"),
      price: 2.5,
      busId: bus.id,
    },
  });
  alice = await prisma.user.create({
    data: { name: "Alice", email: "alice@test.local" },
  });
  bob = await prisma.user.create({
    data: { name: "Bob", email: "bob@test.local" },
  });
});

afterAll(async () => {
  await reset();
  await prisma.$disconnect();
});

const mockRes = () => {
  const res = {};
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  return res;
};

describe("booking against a real database", () => {
  it("books seats and returns every booked seat on the trip", async () => {
    const result = await bookTripCore({
      tripId: trip.id,
      seats: [1, 2],
      userId: alice.id,
    });
    expect(result.booking.userId).toBe(alice.id);
    expect(result.allBookedSeats.sort()).toEqual([1, 2]);
  });

  it("never double-books a seat under concurrent requests", async () => {
    const attempts = await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) =>
        bookTripCore({
          tripId: trip.id,
          seats: [3],
          userId: i % 2 ? alice.id : bob.id,
        }),
      ),
    );
    const ok = attempts.filter((a) => a.status === "fulfilled");
    expect(ok).toHaveLength(1);
    expect(await prisma.bookedSeat.count({ where: { tripId: trip.id } })).toBe(
      1,
    );
    // A failed attempt must not leave an empty booking behind.
    expect(await prisma.booking.count()).toBe(1);
  });

  it("rejects a seat above the bus capacity", async () => {
    await expect(
      bookTripCore({ tripId: trip.id, seats: [11], userId: alice.id }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("returns 404 for an unknown trip", async () => {
    await expect(
      bookTripCore({ tripId: trip.id + 999, seats: [1], userId: alice.id }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("only shows a booking to its owner or an admin", async () => {
    const { booking } = await bookTripCore({
      tripId: trip.id,
      seats: [4],
      userId: alice.id,
    });
    const params = { id: String(booking.id) };

    const asBob = mockRes();
    await getBookingById({ params, user: { id: bob.id, role: "USER" } }, asBob);
    expect(asBob.statusCode).toBe(404);

    const asAlice = mockRes();
    await getBookingById(
      { params, user: { id: alice.id, role: "USER" } },
      asAlice,
    );
    expect(asAlice.statusCode).toBe(200);

    const asAdmin = mockRes();
    await getBookingById(
      { params, user: { id: bob.id, role: "ADMIN" } },
      asAdmin,
    );
    expect(asAdmin.statusCode).toBe(200);
  });
});

describe("seat locks against a real database", () => {
  const lock = (user, seat, socketId = `sock-${user.id}`) =>
    lockSeat({ tripId: trip.id, seat, userId: user.id, socketId });

  it("lets only one user hold a seat", async () => {
    expect(await lock(alice, 5)).toBe(true);
    expect(await lock(bob, 5)).toBe(false);
    expect(await getLockedSeats(trip.id)).toEqual([5]);
  });

  it("caps how many seats one user can hold", async () => {
    for (let s = 1; s <= 6; s++) expect(await lock(alice, s)).toBe(true);
    expect(await lock(alice, 7)).toBe(false);
  });

  it("enforces the cap even when lock requests arrive at the same time", async () => {
    const results = await Promise.all(
      Array.from({ length: 9 }, (_, i) => lock(alice, i + 1)),
    );
    expect(results.filter(Boolean)).toHaveLength(6);
    expect(await prisma.seatLock.count({ where: { userId: alice.id } })).toBe(
      6,
    );
  });

  it("rejects seats that are invalid or already booked", async () => {
    await bookTripCore({ tripId: trip.id, seats: [2], userId: bob.id });
    expect(await lock(alice, 2)).toBe(false);
    expect(await lock(alice, 0)).toBe(false);
    expect(await lock(alice, 11)).toBe(false);
  });

  it("only lets the holding socket unlock", async () => {
    await lock(alice, 5, "a1");
    expect(
      await unlockSeat({ tripId: trip.id, seat: 5, socketId: "other" }),
    ).toBe(false);
    expect(await unlockSeat({ tripId: trip.id, seat: 5, socketId: "a1" })).toBe(
      true,
    );
  });

  it("blocks booking a seat held by someone else, but not by yourself", async () => {
    await lock(alice, 6);
    await expect(
      bookTripCore({ tripId: trip.id, seats: [6], userId: bob.id }),
    ).rejects.toMatchObject({ status: 409 });

    await bookTripCore({ tripId: trip.id, seats: [6], userId: alice.id });
    // The hold is cleared once the seat is booked.
    expect(await getLockedSeats(trip.id)).toEqual([]);
  });

  it("releases a socket's locks on disconnect", async () => {
    await lock(alice, 1, "a1");
    await lock(alice, 2, "a1");
    const released = await releaseSocketLocks("a1");
    expect(released.map((l) => l.seatNumber).sort()).toEqual([1, 2]);
    expect(await getLockedSeats(trip.id)).toEqual([]);
  });

  it("ignores and sweeps expired locks", async () => {
    await lock(alice, 8);
    await prisma.seatLock.updateMany({
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await getLockedSeats(trip.id)).toEqual([]);
    // Someone else can take the seat once the hold has run out.
    expect(await lock(bob, 8)).toBe(true);
    await prisma.seatLock.updateMany({
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await sweepExpiredLocks()).map((l) => l.seatNumber)).toEqual([8]);
  });
});
