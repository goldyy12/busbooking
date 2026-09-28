import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBus, updateBus, getAllBuses } from "./busController";
import prisma from "../../db.js";

vi.mock("../../db.js", () => ({
  default: {
    bus: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("Bus Controller Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a bus successfully", async () => {
    prisma.bus.create.mockResolvedValue({
      busNumber: 1,
      totalSeats: 50,
    });

    const req = {
      body: {
        busNumber: 1,
        totalSeats: 50,
      },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await createBus(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      busNumber: 1,
      totalSeats: 50,
    });
  });

  it("should update a bus successfully", async () => {
    prisma.bus.update.mockResolvedValue({
      id: 1,
      busNumber: 1,
      totalSeats: 50,
    });

    const req = {
      params: { id: 1 },
      body: { busNumber: 1, totalSeats: 50 },
    };

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await updateBus(req, res);

    expect(res.json).toHaveBeenCalledWith({
      id: 1,
      busNumber: 1,
      totalSeats: 50,
    });
  });

  it("should get all buses successfully", async () => {
    prisma.bus.findMany.mockResolvedValue([
      { id: 1, busNumber: 1, totalSeats: 50 },
      { id: 2, busNumber: 2, totalSeats: 40 },
    ]);
    const req = {};

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    await getAllBuses(req, res);

    expect(res.json).toHaveBeenCalledWith([
      { id: 1, busNumber: 1, totalSeats: 50 },
      { id: 2, busNumber: 2, totalSeats: 40 },
    ]);
  });
  it("should handle errors when creating a bus", async () => {
    const dbError = new Error("Database error");
    prisma.bus.create.mockRejectedValue(dbError);
    const req = { body: { busNumber: 1, totalSeats: 50 } };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();

    await createBus(req, res, next);

    expect(next).toHaveBeenCalledWith(dbError);
  });
});
