// tripService.js (or bookingService.js)
import prisma from "../../db.js";

export async function bookTripCore({ tripId, seats, userId }) {
  const requestedSeats = seats.map(Number);

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip) {
    const error = new Error("Trip not found");
    error.status = 404;
    throw error;
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
