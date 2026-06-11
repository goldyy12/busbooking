import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createBooking,
  getBookingById,
  getAllBookings,
} from "./bookingController";
import prisma from "../../db.js";
import { create } from "node:domain";


vi.mock("../../db.js", () => ({
  default: {
    booking: {
      findUnique: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    trip: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Booking Controller Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 if trip is not found", async () => {
    const req = {
      body: { tripId: 999, seats: [1, 2] },
      user: { userId: 1 },
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    await createBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Trip not found" });
  });
  it("should return 400 if seats are already booked", async () => {
    prisma.trip.findUnique.mockResolvedValue({ id: 1 });
    prisma.booking.findMany.mockResolvedValue([{ seats: [1, 2] }]);
    const req = {
      body: { tripId: 1, seats: [1, 2] },
      user: { userId: 1 },
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    await createBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "One or more seats already booked",
    });
  });
  it("should create a booking successfully", async () => {
    prisma.trip.findUnique.mockResolvedValue({ id: 1 });
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.booking.create.mockResolvedValue({
      id: 123,
      tripId: 1,
      userId: 1,
      seats: [3, 4],
      status: "CONFIRMED",
    });
    const req = {
      body: { tripId: 1, seats: [3, 4] },
      user: { userId: 1 },
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    await createBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      id: 123,
      tripId: 1,
      userId: 1,
      seats: [3, 4],
      status: "CONFIRMED",
    });
  });
  it("should return booking by ID", async () => {
    prisma.booking.findUnique.mockResolvedValue({
      id: 123,
      tripId: 1,
      userId: 1,
      seats: [3, 4],
      status: "CONFIRMED",
    });
    const req = {
      params: { id: 123 },
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    await getBookingById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      id: 123,
      tripId: 1,
      userId: 1,
      seats: [3, 4],
      status: "CONFIRMED",
    });
  });
  it("should return 404 if booking not found", async () => {
    prisma.booking.findUnique.mockResolvedValue(null);
    const req = {
      params: { id: 999 },
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    await getBookingById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Booking not found" });
  });
  it("should return all bookings", async () => {
    prisma.booking.findMany.mockResolvedValue([
      {
        id: 123,
        tripId: 1,
        userId: 1,
        trip: { id: 123 },
        user: { id: 123 },
      },
    ]);
    const req = {};
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    await getAllBookings(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([
      {
        tripId: 1,
        userId: 1,
        trip: { id: 123 },
        user: { id: 123 },
        id: 123,
      },
    ]);
  });
});
