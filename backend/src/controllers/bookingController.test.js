import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createBooking,
  getBookingById,
  getAllBookings,
} from "./bookingController";
import prisma from "../../db.js";

// Definojmë funksionet mock për operacionet e zakonshme dhe ato brenda transaksionit
const mockBookingFindMany = vi.fn();
const mockBookingCreate = vi.fn();
const mockBookingFindUnique = vi.fn();
const mockTripFindUnique = vi.fn();

vi.mock("../../db.js", () => ({
  default: {
    // Shtojmë mock-un për transaksionin interaktiv
    $transaction: vi.fn(async (callback) => {
      // Kalojmë një objekt "tx" artificial që përdor të njëjtat funksione mock
      return await callback({
        booking: {
          findMany: mockBookingFindMany,
          create: mockBookingCreate,
        },
      });
    }),
    booking: {
      findUnique: mockBookingFindUnique,
      findMany: mockBookingFindMany, // Për rastet jashtë transaksionit si getAllBookings
    },
    trip: {
      findUnique: mockTripFindUnique,
    },
  },
}));

describe("Booking Controller Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 if trip is not found", async () => {
    mockTripFindUnique.mockResolvedValue(null);
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

  it("should return 409 if seats are already booked inside transaction", async () => {
    mockTripFindUnique.mockResolvedValue({ id: 1 });
    // Simulojmë që ulëset 1 dhe 2 janë tashmë të zëna
    mockBookingFindMany.mockResolvedValue([{ seats: [1, 2] }]);

    const req = {
      body: { tripId: 1, seats: [1, 2] },
      user: { userId: 1 },
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    await createBooking(req, res);

    // VREJTJE: Kodi i ri kthen 409 Conflict për ulëset e zëna!
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "One or more seats already booked",
    });
  });

  it("should create a booking successfully inside transaction", async () => {
    mockTripFindUnique.mockResolvedValue({ id: 1 });
    mockBookingFindMany.mockResolvedValue([]); // Asnjë ulëse e zënë
    mockBookingCreate.mockResolvedValue({
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
    mockBookingFindUnique.mockResolvedValue({
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
    mockBookingFindUnique.mockResolvedValue(null);
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
    mockBookingFindMany.mockResolvedValue([
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
        id: 123,
        tripId: 1,
        userId: 1,
        trip: { id: 123 },
        user: { id: 123 },
      },
    ]);
  });
});
