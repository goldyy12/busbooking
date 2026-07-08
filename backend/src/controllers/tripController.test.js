import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  createTrip,
  getAllTrips,
  getTripById,
  searchTrips,
} from "./tripController";
import prisma from "../../db.js";
import { buffer } from "node:stream/consumers";

vi.mock("../../db.js", () => ({
  default: {
    trip: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

describe("Trip Controller Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  {
    it("should create a trip successfully", async () => {
      prisma.trip.create.mockResolvedValue({
        from: "CityA",
        to: "CityB",
        date: new Date("2024-07-01T10:00:00Z"),
        busId: 1,
        price: 25.5,
      });
      const req = {
        body: {
          from: "CityA",
          to: "CityB",
          date: "2024-07-01T10:00:00Z",
          busId: 1,
          price: 25.5,
        },
      };
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };
      await createTrip(req, res);
      expect(prisma.trip.create).toHaveBeenCalledWith({
        data: {
          from: "CityA",
          to: "CityB",
          date: new Date("2024-07-01T10:00:00Z"),
          busId: 1,
          price: 25.5,
        },
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        from: "CityA",
        to: "CityB",
        date: new Date("2024-07-01T10:00:00Z"),
        busId: 1,
        price: 25.5,
      });
    });
  }
  it("should get all trips successfully", async () => {
    prisma.trip.findMany.mockResolvedValue([
      {
        from: "CityA",
        to: "CityB",
        date: new Date("2024-07-01T10:00:00Z"),
        busId: 1,
        price: 25.5,
      },
    ]);
    const req = {};
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    await getAllTrips(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([
      {
        from: "CityA",
        to: "CityB",
        date: new Date("2024-07-01T10:00:00Z"),
        busId: 1,
        price: 25.5,
      },
    ]);
  });
  it("should handle errors when creating a trip", async () => {
    const errorMessage = "Database error";
    prisma.trip.create.mockRejectedValue(new Error(errorMessage));
    const req = {
      body: {
        from: "CityA",
        to: "CityB",
        date: "2024-07-01T10:00:00Z",
        busId: 1,
        price: 25.5,
      },
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    await createTrip(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: errorMessage });
  });
  it("should find a trip by ID successfully", async () => {
    const tripId = 1;
    prisma.trip.findUnique.mockResolvedValue({
      id: tripId,
      from: "CityA",
      to: "CityB",
      date: new Date("2024-07-01T10:00:00Z"),
      busId: 1,
      price: 25.5,
      bookings: [{ seats: [1, 2, 3] }],
      bookedSeats: [1, 2, 3],
    });
    const req = {
      params: { id: tripId.toString() },
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    await getTripById(req, res);
    expect(prisma.trip.findUnique).toHaveBeenCalledWith({
      where: { id: tripId },
      include: {
        bookings: {
          include: { bookedSeats: true },
        },
        bus: true,
      },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      id: tripId,
      from: "CityA",
      to: "CityB",
      date: new Date("2024-07-01T10:00:00Z"),
      busId: 1,
      price: 25.5,
      bookings: [{ seats: [1, 2, 3] }],

      bookedSeats: [1, 2, 3],
    });
  });
  it("should return 404 if trip is not found", async () => {
    prisma.trip.findUnique.mockResolvedValue(null);

    const req = { params: { id: "999" } };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await getTripById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Trip not found" });
  });
  it("should search trips successfully", async () => {
    prisma.trip.findMany.mockResolvedValue([
      {
        from: "Prishtina",
        to: "Ferizaj",
        date: new Date("2026-07-01T10:00:00Z"),
        busId: 1,
        price: 5.0,
      },
    ]);
    const req = {
      query: { from: "Prishtina", to: "Ferizaj", date: "2026-07-01" },
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    await searchTrips(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([
      {
        from: "Prishtina",
        to: "Ferizaj",
        date: new Date("2026-07-01T10:00:00Z"),
        busId: 1,
        price: 5.0,
      },
    ]);
  });
  it("should return 400 if no search params are provided", async () => {
    const req = {
      query: {},
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await searchTrips(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "At least one search parameter is required",
    });
  });
});
