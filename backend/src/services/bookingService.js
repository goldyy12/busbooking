import prisma from "../../db.js";

export const MAX_SEATS_PER_BOOKING = 6;

const badRequest = (message) => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

export async function bookTripCore({ tripId, seats, userId }) {
  tripId = Number(tripId);
  if (!Number.isInteger(tripId) || tripId <= 0) {
    throw badRequest("Invalid tripId");
  }

  if (
    !Array.isArray(seats) ||
    seats.length === 0 ||
    seats.length > MAX_SEATS_PER_BOOKING
  ) {
    throw badRequest(
      `You must book between 1 and ${MAX_SEATS_PER_BOOKING} seats`,
    );
  }

  const requestedSeats = seats.map(Number);
  if (new Set(requestedSeats).size !== requestedSeats.length) {
    throw badRequest("Duplicate seat numbers");
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { bus: true },
  });

  if (!trip) {
    const error = new Error("Trip not found");
    error.status = 404;
    throw error;
  }

  const totalSeats = trip.bus?.totalSeats;
  const invalid = requestedSeats.filter(
    (s) => !Number.isInteger(s) || s < 1 || (totalSeats && s > totalSeats),
  );
  if (invalid.length) {
    throw badRequest(`Invalid seat number(s): ${invalid.join(", ")}`);
  }

  const { booking, allBookedSeats } = await prisma.$transaction(async (tx) => {
    const newBooking = await tx.booking.create({
      data: {
        tripId,
        userId,
        status: "CONFIRMED",
      },
    });

    await tx.bookedSeat.createMany({
      data: requestedSeats.map((seatNumber) => ({
        tripId,
        seatNumber,
        bookingId: newBooking.id,
      })),
    });

    const all = await tx.bookedSeat.findMany({
      where: { tripId },
      select: { seatNumber: true },
    });

    return {
      booking: newBooking,
      allBookedSeats: all.map((s) => s.seatNumber),
    };
  });

  return {
    booking,
    allBookedSeats,
    requestedSeats,
  };
}
