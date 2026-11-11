import prisma from "../../db.js";
import { bookTripCore } from "../services/bookingService.js";
import { emitSeatBooked } from "../realtime/io.js";

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
    const userId = req.user.id;

    const { booking, allBookedSeats, requestedSeats } = await bookTripCore({
      tripId,
      seats,
      userId,
    });

    emitSeatBooked(booking.tripId, { requestedSeats, allBookedSeats });

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
};
export const getBookingById = async (req, res, next) => {
  try {
    const bookingId = Number(req.params.id);
    if (!Number.isInteger(bookingId)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        trip: true,
      },
    });

    // Only the owner or an admin may see a booking. Return 404 (not 403)
    // so other users cannot tell which booking IDs exist.
    const isOwner = booking && booking.userId === req.user.id;
    if (!booking || (!isOwner && req.user.role !== "ADMIN")) {
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
