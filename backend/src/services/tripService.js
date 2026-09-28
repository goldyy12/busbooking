import prisma from "../../db.js";

export async function searchTripsCore({ from, to, date }) {
  const where = {};
  if (from) where.from = from;
  if (to) where.to = to;

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    where.date = { gte: startOfDay, lte: endOfDay };
  }

  if (Object.keys(where).length === 0) {
    throw new Error("At least one search parameter is required");
  }

  return await prisma.trip.findMany({ where });
}
export async function getTripByIdCore(tripId) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      bookings: { include: { bookedSeats: true } },
    },
  });

  if (!trip) {
    throw new Error("Trip not found");
  }

  const bookedSeats = trip.bookings.flatMap((b) =>
    b.bookedSeats.map((s) => s.seatNumber),
  );

  return {
    id: trip.id,
    from: trip.from,
    to: trip.to,
    date: trip.date,
    price: trip.price,
    bookedSeats, // so the model can also tell if a seat is already taken
  };
}
