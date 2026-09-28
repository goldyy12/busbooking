import { searchTripsCore } from "../services/tripService.js";

import prisma from "../../db.js";
export const getAllTrips = async (req, res, next) => {
  try {
    const trips = await prisma.trip.findMany();
    res.status(200).json(trips);
  } catch (error) {
    next(error);
  }
};
export const createTrip = async (req, res, next) => {
  try {
    const { from, to, date, busId, price } = req.body;
    if (!from || !to || !date || !busId || !price) {
      return res.status(400).json({ error: "All fields are required" });
    }
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
    next(error);
  }
};

export const searchTrips = async (req, res, next) => {
  try {
    const { from, to, date } = req.query;
    const trips = await searchTripsCore({ from, to, date });
    res.status(200).json(trips);
  } catch (error) {
    next(error);
  }
};
export const getTripById = async (req, res, next) => {
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
    next(error);
  }
};
