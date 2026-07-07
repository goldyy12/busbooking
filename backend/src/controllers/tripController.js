import prisma from "../../db.js";
export const getAllTrips = async (req, res) => {
  try {
    const trips = await prisma.trip.findMany();
    res.status(200).json(trips);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const createTrip = async (req, res) => {
  try {
    const { from, to, date, busId, price } = req.body;

    const trip = await prisma.trip.create({
      data: {
        from,
        to,
        date: new Date(date),
        busId: parseInt(busId),
        price: parseFloat(price),
      },
    });

    res.status(201).json(trip);
  } catch (error) {
    console.error("Error creating trip:", error);
    res.status(500).json({ error: error.message });
  }
};
export const searchTrips = async (req, res) => {
  try {
    const { from, to, date } = req.query;

    const where = {};
    if (from) where.from = from;
    if (to) where.to = to;

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);

      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }
    if (Object.keys(where).length === 0) {
      return res
        .status(400)
        .json({ error: "At least one search parameter is required" });
    }

    const trips = await prisma.trip.findMany({
      where,
    });

    res.status(200).json(trips);
  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ error: "Failed to fetch trips" });
  }
};
export const getTripById = async (req, res) => {
  try {
    const tripId = parseInt(req.params.id);

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        bus: true,
        bookings: {
          include: {
            bookedSeats: true,
          },
        },
      },
    });

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    const bookedSeats = trip.bookings?.flatMap((b) =>
      b.bookedSeats.map((s) => s.seatNumber),
    );

    res.status(200).json({
      ...trip,
      bookedSeats,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
