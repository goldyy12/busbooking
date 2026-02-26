import prisma from "../../db.js";
export const getAllTrips = async (req, res) => {
  try {
    const trips = await prisma.trip.findMany();
    res.json(trips);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const createTrip = async (req, res) => {
  try {
    // 1. Extract 'price' along with the other fields
    const { from, to, date, busId, price } = req.body;

    const trip = await prisma.trip.create({
      data: {
        from,
        to,
        date: new Date(date), // Converts string "2026-06-15..." to JS Date
        busId: parseInt(busId), // Ensures busId is a number
        price: parseFloat(price), // Ensures price is a decimal/float
      },
    });

    res.status(201).json(trip);
  } catch (error) {
    // 2. Logging the error to your terminal is helpful for debugging
    console.error("Error creating trip:", error);
    res.status(500).json({ error: error.message });
  }
};
export const searchTrips = async (req, res) => {
  try {
    // 1. Extract variables FIRST
    const { from, to, date } = req.query;

    // 2. Initialize the search object
    const where = {};
    if (from) where.from = from;
    if (to) where.to = to;

    // 3. Handle the Date (Stripping time to cover the whole day)
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

    // 4. Execute the query
    const trips = await prisma.trip.findMany({
      where,
    });

    res.json(trips);
  } catch (error) {
    // Log this so you can see if Prisma itself has an issue (like missing 'bus' relation)
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
        bookings: true,
      },
    });

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    const bookedSeats = trip.bookings.flatMap((b) => b.seats);

    res.json({
      ...trip,
      bookedSeats,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
