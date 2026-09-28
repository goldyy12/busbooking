import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";
import prisma from "../db.js"; // adjust path relative to utils/ folder

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role || "USER",
    },
    JWT_SECRET,
    { expiresIn: "15m" },
  );
};

export const generateRefreshToken = async (user, familyId) => {
  const refreshToken = crypto.randomBytes(64).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const tokenHash = crypto
    .createHash("sha256")
    .update(refreshToken)
    .digest("hex");

  await prisma.refreshToken.create({
    data: {
      tokenHash: tokenHash,
      userId: user.id,
      familyId: familyId,
      expiresAt: expiresAt,
    },
  });

  return refreshToken;
};
