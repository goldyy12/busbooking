import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import cookieParser from "cookie-parser";
import session from "express-session";
import { errorHandler } from "./src/middlewares/errorHandler.js";

import bookingRoutes from "./src/routes/bookingRoutes.js";
import busRoutes from "./src/routes/busRoutes.js";
import tripRoutes from "./src/routes/tripRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
import jwt from "jsonwebtoken";
import { setIO } from "./src/realtime/io.js";
import { MAX_SEATS_PER_BOOKING } from "./src/services/bookingService.js";
import agentRoutes from "./src/routes/agentRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  "https://busbooking-omega.vercel.app",
  "https://busbooking-git-main-diar-selmanis-projects.vercel.app",
];
app.set("trust proxy", 1);
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS: " + origin));
      }
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  }),
);

app.use("/api/bookings", bookingRoutes);
app.use("/api/buses", busRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/agent", agentRoutes);

const server = http.createServer(app);
app.get("/health", (req, res) => res.status(200).send("OK"));
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

setIO(io);

// Seat locks are held in memory: { [tripId]: { [seat]: socketId } }.
// They are temporary holds while a user picks seats; the database is still
// the source of truth for bookings (unique tripId+seatNumber).
const seatLocks = {};

const isPositiveInt = (n) => Number.isInteger(n) && n > 0;

// Anyone may connect to watch seat updates, but only logged-in users
// can lock seats. The client sends its access token in the handshake.
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.userId = decoded.userId;
    } catch {
      // Invalid/expired token: treat as anonymous viewer.
    }
  }
  next();
});

const locksHeldBy = (socketId, tripId) =>
  Object.values(seatLocks[tripId] || {}).filter((id) => id === socketId)
    .length;

io.on("connection", (socket) => {
  socket.on("join-trip", (tripId) => {
    if (!isPositiveInt(tripId)) return;
    socket.join(`trip-${tripId}`);
    const lockedSeats = seatLocks[tripId]
      ? Object.keys(seatLocks[tripId]).map(Number)
      : [];
    socket.emit("sync-locked-seats", lockedSeats);
  });

  socket.on("lock-seat", ({ tripId, seat } = {}) => {
    if (!socket.data.userId) return;
    if (!isPositiveInt(tripId) || !isPositiveInt(seat)) return;
    if (!seatLocks[tripId]) seatLocks[tripId] = {};
    if (seatLocks[tripId][seat]) return;
    if (locksHeldBy(socket.id, tripId) >= MAX_SEATS_PER_BOOKING) return;
    seatLocks[tripId][seat] = socket.id;
    io.to(`trip-${tripId}`).emit("seat-locked", { seat });
  });

  socket.on("unlock-seat", ({ tripId, seat } = {}) => {
    // Only the socket that locked a seat may unlock it.
    if (seatLocks[tripId]?.[seat] === socket.id) {
      delete seatLocks[tripId][seat];
      io.to(`trip-${tripId}`).emit("seat-unlocked", { seat });
    }
  });

  socket.on("disconnect", () => {
    for (const tripId in seatLocks) {
      for (const seat in seatLocks[tripId]) {
        if (seatLocks[tripId][seat] === socket.id) {
          delete seatLocks[tripId][seat];
          io.to(`trip-${tripId}`).emit("seat-unlocked", {
            seat: Number(seat),
          });
        }
      }
      if (Object.keys(seatLocks[tripId]).length === 0) delete seatLocks[tripId];
    }
  });
});
app.use(errorHandler);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
