import prisma from "../../db.js";
import { bookTripCore } from "../services/bookingService.js";

let io;

export const setIO = (ioInstance) => {
  io = ioInstance;
};

export const getAllBookings = async (req, res, next) => {
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
    next(error);
  }
};

export const createBooking = async (req, res, next) => {
  try {
    const { tripId, seats } = req.body;
    const userId = req.user.userId || req.user.id;

    const { booking, allBookedSeats, requestedSeats } = await bookTripCore({
      tripId,
      seats,
      userId,
    });

    if (io) {
      io.to(`trip-${tripId}`).emit("seat-booked", {
        requestedSeats,
        allBookedSeats,
      });
    }

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
};
export const getBookingById = async (req, res, next) => {
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
    next(error);
  }
};

export const getMyBookings = async (req, res, next) => {
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
        bookedSeats: true,
      },
    });

    res.json(bookings);
  } catch (error) {
    next(error);
  }
};
