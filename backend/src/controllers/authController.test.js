import { describe, it, expect, vi, beforeEach } from "vitest";
import { register, login } from "./authController";
import prisma from "../../db.js";

// This "mocks" the database so we don't need a real one running
vi.mock("../../db.js", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("Auth Controller Tests", () => {
  // Reset mocks before each test so they don't interfere with each other
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if password is less than 8 characters", async () => {
    const req = {
      body: { username: "testuser", email: "test@test.com", password: "123" },
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "The password must contain at least 8 characters",
    });
  });

  it("should return 400 for login if user is not found", async () => {
    // Tell the "fake" Prisma to return null (user not found)
    prisma.user.findUnique.mockResolvedValue(null);

    const req = {
      body: { email: "wrong@test.com", password: "password123" },
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid credentials" });
  });
});
