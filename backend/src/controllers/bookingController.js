import prisma from "../../db.js";

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

    const { booking, allBookedSeats } = await prisma.$transaction(
      async (tx) => {
        const newBooking = await tx.booking.create({
          data: { tripId, userId, status: "CONFIRMED" },
        });

        // this insert is what actually enforces no-double-booking
        // if two requests race, one of them throws P2002 here
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

    if (io) {
      io.to(`trip-${tripId}`).emit("seat-booked", {
        requestedSeats,
        allBookedSeats,
      });
    }

    res.status(201).json(booking);
  } catch (error) {
    if (error.code === "P2002") {
      // unique constraint hit — someone else grabbed a seat first
      return res
        .status(409)
        .json({ error: "One or more seats already booked" });
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
