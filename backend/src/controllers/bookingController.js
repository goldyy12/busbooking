import prisma from "../../db.js";

// 1. Deklarojmë instancën e IO në majë të skedarit që të jetë e disponueshme kudo
let io;

export const setIO = (ioInstance) => {
  io = ioInstance;
};

export const getAllBookings = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        trip: true,
        user: true,
      },
    });
    res.status(200).json(bookings);
  } catch (error) {
    console.error("Get All Bookings error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

export const createBooking = async (req, res) => {
  try {
    const { tripId, seats } = req.body;
    const userId = req.user.userId || req.user.id;
    const requestedSeats = seats.map(Number);

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    const booking = await prisma.$transaction(async (tx) => {
      const existingBookings = await tx.booking.findMany({
        where: { tripId },
      });
      const bookedSeats = existingBookings.flatMap((b) => b.seats);

      const seatConflict = requestedSeats.some((seat) =>
        bookedSeats.includes(seat),
      );
      if (seatConflict) {
        throw new Error("One or more seats already booked");
      }

      return await tx.booking.create({
        data: {
          tripId,
          userId,
          seats: requestedSeats,
          status: "CONFIRMED",
        },
      });
    });

    // Fetch updated trip with all bookings
    const updatedTrip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        bus: true,
        bookings: true,
      },
    });

    const allBookedSeats = updatedTrip.bookings?.flatMap((b) => b.seats) || [];

    // Emit updated seat information to all clients in this trip
    if (io) {
      console.log(`Emitting seat-booked for trip-${tripId}:`, requestedSeats);
      io.to(`trip-${tripId}`).emit("seat-booked", {
        seats: requestedSeats,
        allBookedSeats: allBookedSeats,
      });
    }

    res.status(201).json(booking);
  } catch (error) {
    if (error.message === "One or more seats already booked") {
      return res.status(409).json({ error: error.message });
    }
    console.error("Create Booking error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

export const getBookingById = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        trip: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    if (!userId) {
      return res.status(400).json({ error: "Invalid User ID format" });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        userId: userId,
      },
      include: {
        trip: {
          include: { bus: true },
        },
      },
    });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
