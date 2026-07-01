import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createBooking,
  getBookingById,
  getAllBookings,
} from "./bookingController";
import prisma from "../../db.js";

vi.mock("../../db.js", () => {
  return {
    default: {
      $transaction: vi.fn(),
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
    vi.mocked(prisma.trip.findUnique).mockResolvedValue(null);

    const req = { body: { tripId: 999, seats: [1, 2] }, user: { userId: 1 } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await createBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Trip not found" });
  });

  it("should return 409 if seats are already booked (unique constraint violation)", async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue({ id: 1 });

    // simulate Prisma throwing P2002 when bookedSeat.createMany hits the unique constraint
    const p2002Error = new Error("Unique constraint failed");
    p2002Error.code = "P2002";
    vi.mocked(prisma.$transaction).mockRejectedValueOnce(p2002Error);

    const req = { body: { tripId: 1, seats: [1, 2] }, user: { userId: 1 } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await createBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "One or more seats already booked",
    });
  });

  it("should create a booking successfully and return all booked seats", async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue({ id: 1 });

    vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback) => {
      const mockDbInTx = {
        booking: {
          create: vi.fn().mockResolvedValue({
            id: 123,
            tripId: 1,
            userId: 1,
            status: "CONFIRMED",
          }),
        },
        bookedSeat: {
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
          findMany: vi
            .fn()
            .mockResolvedValue([{ seatNumber: 3 }, { seatNumber: 4 }]),
        },
      };
      return await callback(mockDbInTx);
    });

    const req = { body: { tripId: 1, seats: [3, 4] }, user: { userId: 1 } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await createBooking(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      id: 123,
      tripId: 1,
      userId: 1,
      status: "CONFIRMED",
    });
  });

  it("should return booking by ID", async () => {
    vi.mocked(prisma.booking.findUnique).mockResolvedValue({
      id: 123,
      tripId: 1,
      userId: 1,
      status: "CONFIRMED",
    });
    const req = { params: { id: 123 } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await getBookingById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      id: 123,
      tripId: 1,
      userId: 1,
      status: "CONFIRMED",
    });
  });

  it("should return 404 if booking not found", async () => {
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(null);
    const req = { params: { id: 999 } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await getBookingById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Booking not found" });
  });

  it("should return all bookings", async () => {
    vi.mocked(prisma.booking.findMany).mockResolvedValue([
      { id: 123, tripId: 1, userId: 1, trip: { id: 123 }, user: { id: 123 } },
    ]);
    const req = {};
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await getAllBookings(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([
      { id: 123, tripId: 1, userId: 1, trip: { id: 123 }, user: { id: 123 } },
    ]);
  });
});
