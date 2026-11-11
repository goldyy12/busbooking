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

  it("should pass seat conflict error to next", async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue({ id: 1, bus: { totalSeats: 40 } });

    const p2002Error = new Error("Unique constraint failed");
    p2002Error.code = "P2002";

    vi.mocked(prisma.$transaction).mockRejectedValueOnce(p2002Error);

    const req = {
      body: { tripId: 1, seats: [1, 2] },
      user: { id: 1 },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const next = vi.fn();

    await createBooking(req, res, next);

    expect(next).toHaveBeenCalledWith(p2002Error);
  });

  it("should return 409 if seats are already booked (unique constraint violation)", async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue({ id: 1, bus: { totalSeats: 40 } });

    const p2002Error = new Error("Unique constraint failed");
    p2002Error.code = "P2002";

    vi.mocked(prisma.$transaction).mockRejectedValueOnce(p2002Error);

    const req = {
      body: { tripId: 1, seats: [1, 2] },
      user: { id: 1 },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    const next = vi.fn();

    await createBooking(req, res, next);

    expect(next).toHaveBeenCalledWith(p2002Error);
  });
  it("should create a booking successfully and return all booked seats", async () => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue({ id: 1, bus: { totalSeats: 40 } });

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

    const req = { body: { tripId: 1, seats: [3, 4] }, user: { id: 1 } };
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
    const req = { params: { id: "123" }, user: { id: 1, role: "USER" } };
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
    const req = { params: { id: "999" }, user: { id: 1, role: "USER" } };
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

  it("should hide another user's booking (404)", async () => {
    vi.mocked(prisma.booking.findUnique).mockResolvedValue({
      id: 123,
      tripId: 1,
      userId: 2,
    });
    const req = { params: { id: "123" }, user: { id: 1, role: "USER" } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await getBookingById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("should let an admin see any booking", async () => {
    const booking = { id: 123, tripId: 1, userId: 2 };
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(booking);
    const req = { params: { id: "123" }, user: { id: 1, role: "ADMIN" } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await getBookingById(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(booking);
  });

  it.each([
    ["a seat above the bus capacity", [41]],
    ["seat zero", [0]],
    ["a negative seat", [-3]],
    ["a non-integer seat", [1.5]],
    ["duplicate seats", [2, 2]],
    ["an empty seat list", []],
    ["too many seats", [1, 2, 3, 4, 5, 6, 7]],
  ])("should reject %s with 400", async (_label, seats) => {
    vi.mocked(prisma.trip.findUnique).mockResolvedValue({
      id: 1,
      bus: { totalSeats: 40 },
    });
    const req = { body: { tripId: 1, seats }, user: { id: 1 } };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    await createBooking(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 400 }));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
