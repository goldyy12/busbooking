// tripService.js (or bookingService.js)
import prisma from "../../db.js";

export async function bookTripCore({ tripId, seats, userId }) {
  const requestedSeats = seats.map(Number);

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) {
    throw new Error("Trip not found");
  }

  try {
    const { booking, allBookedSeats } = await prisma.$transaction(
      async (tx) => {
        const newBooking = await tx.booking.create({
          data: { tripId, userId, status: "CONFIRMED" },
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
      },
    );

    return { booking, allBookedSeats, requestedSeats };
  } catch (error) {
    if (error.code === "P2002") {
      throw new Error(
        "One or more of those seats were just booked by someone else. Please choose different seats.",
      );
    }
    throw error;
  }
}
