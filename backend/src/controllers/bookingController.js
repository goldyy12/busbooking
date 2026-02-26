import prisma from "../../db.js";

/**
 * GET ALL BOOKINGS (ADMIN)
 */
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        trip: true,
        user: true,
      },
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * CREATE BOOKING (USER)
 */
export const createBooking = async (req, res) => {
  try {
    const { tripId, seats } = req.body;
    const userId = req.user.userId || req.user.id;

    const requestedSeats = seats.map(Number);

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    const existingBookings = await prisma.booking.findMany({
      where: { tripId },
    });
    const bookedSeats = existingBookings.flatMap((b) => b.seats);

    const seatConflict = requestedSeats.some((seat) =>
      bookedSeats.includes(seat),
    );
    if (seatConflict) {
      return res
        .status(400)
        .json({ error: "One or more seats already booked" });
    }

    const booking = await prisma.booking.create({
      data: { tripId, userId, seats: requestedSeats, status: "CONFIRMED" },
    });

    // 🔥 Broadcast to all sockets in this trip room
    if (io) {
      io.to(`trip-${tripId}`).emit("seat-booked", { seats: requestedSeats });
    }

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
/**
 * GET BOOKING BY ID
 */
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

    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const getMyBookings = async (req, res) => {
  try {
    const userId = req.user.id;

    const bookings = await prisma.booking.findMany({
      where: { userId },
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

let io; // will be set from server.js

export const setIO = (ioInstance) => {
  io = ioInstance;
};
