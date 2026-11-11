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
import {
  getLockedSeats,
  lockSeat,
  unlockSeat,
  releaseSocketLocks,
  sweepExpiredLocks,
} from "./src/services/seatLockService.js";
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

// Seat holds live in the database (see seatLockService). The database is the
// source of truth; these handlers just relay changes to the trip's room.
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

const safe = (handler) => async (payload) => {
  try {
    await handler(payload ?? {});
  } catch (err) {
    console.error("Socket handler error:", err.message);
  }
};

const emitUnlocked = (locks) => {
  for (const { tripId, seatNumber } of locks) {
    io.to(`trip-${tripId}`).emit("seat-unlocked", { seat: seatNumber });
  }
};

io.on("connection", (socket) => {
  socket.on(
    "join-trip",
    safe(async (tripId) => {
      if (!isPositiveInt(tripId)) return;
      socket.join(`trip-${tripId}`);
      socket.emit("sync-locked-seats", await getLockedSeats(tripId));
    }),
  );

  socket.on(
    "lock-seat",
    safe(async ({ tripId, seat }) => {
      if (!socket.data.userId) return;
      const ok = await lockSeat({
        tripId,
        seat,
        userId: socket.data.userId,
        socketId: socket.id,
      });
      if (ok) io.to(`trip-${tripId}`).emit("seat-locked", { seat });
    }),
  );

  socket.on(
    "unlock-seat",
    safe(async ({ tripId, seat }) => {
      // Only the socket that locked a seat may unlock it.
      if (await unlockSeat({ tripId, seat, socketId: socket.id })) {
        io.to(`trip-${tripId}`).emit("seat-unlocked", { seat });
      }
    }),
  );

  socket.on(
    "disconnect",
    safe(async () => emitUnlocked(await releaseSocketLocks(socket.id))),
  );
});

// Free holds that ran out without a booking.
const sweepTimer = setInterval(
  safe(async () => emitUnlocked(await sweepExpiredLocks())),
  30 * 1000,
);
sweepTimer.unref();

app.use(errorHandler);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
