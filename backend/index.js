import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

import bookingRoutes from "./src/routes/bookingRoutes.js";
import busRoutes from "./src/routes/busRoutes.js";
import tripRoutes from "./src/routes/tripRoutes.js";
import authRoutes from "./src/routes/authRoutes.js";
import * as bookingController from "./src/controllers/bookingController.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  "https://busbooking-omega.vercel.app",
  "https://busbooking-git-main-diar-selmanis-projects.vercel.app",
];

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

app.use("/api/bookings", bookingRoutes);
app.use("/api/buses", busRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/auth", authRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

bookingController.setIO(io);

const seatLocks = {};

io.on("connection", (socket) => {
  console.log(" Socket connected:", socket.id);

  socket.on("join-trip", (tripId) => {
    socket.join(`trip-${tripId}`);
    const lockedSeats = seatLocks[tripId]
      ? Object.keys(seatLocks[tripId]).map(Number)
      : [];
    socket.emit("sync-locked-seats", lockedSeats);
  });

  socket.on("lock-seat", ({ tripId, seat }) => {
    if (!seatLocks[tripId]) seatLocks[tripId] = {};
    if (seatLocks[tripId][seat]) return;
    seatLocks[tripId][seat] = socket.id;
    io.to(`trip-${tripId}`).emit("seat-locked", { seat });
  });

  socket.on("unlock-seat", ({ tripId, seat }) => {
    if (seatLocks[tripId]?.[seat]) {
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
    }
    console.log(" Socket disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
