import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createBooking,
  getBookingById,
  getAllBookings,
} from "./bookingController";
import prisma from "../../db.js"; // Importojmë Prismën që të kemi qasje te funksionet e saj brenda testeve

// Bëjmë mock direkt pa asnjë variabël të jashtme në top-level
vi.mock("../../db.js", () => {
  return {
    default: {
      $transaction: vi.fn(async (callback) => {
        return await callback({
          booking: {
            findMany: vi.fn(),
            create: vi.fn(),
          },
        });
      }),
      booking: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      trip: {
        findUnique: vi.fn(),
      },
    },
  };
});

describe("Booking Controller Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 if trip is not found", async () => {
    // I qasemi mock-ut direkt përmes objektit prisma të importuar!
    vi.mocked(prisma.trip.findUnique).mockResolvedValue(null);

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
    vi.mocked(prisma.trip.findUnique).mockResolvedValue({ id: 1 });

    // Kjo kap transaksionin e brendshëm sepse përdor të njëjtin referencë
    const mockDbInTx = {
      booking: {
        findMany: vi.fn().mockResolvedValue([{ seats: [1, 2] }]),
      },
    };
    vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback) => {
      return await callback(mockDbInTx);
    });

    const req = {
      body: { tripId: 1, seats: [1, 2] },
      user: { userId: 1 },
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    await createBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "One or more seats already booked",
    });
  });

  it("should create a booking successfully inside transaction", async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue({ id: 1 });

    const mockDbInTx = {
      booking: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({
          id: 123,
          tripId: 1,
          userId: 1,
          seats: [3, 4],
          status: "CONFIRMED",
        }),
      },
    };
    vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback) => {
      return await callback(mockDbInTx);
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
    vi.mocked(prisma.booking.findUnique).mockResolvedValue({
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
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(null);
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
    vi.mocked(prisma.booking.findMany).mockResolvedValue([
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
