import express from "express";
import {
  getAllBookings,
  createBooking,
  getBookingById,
  getMyBookings,
} from "../controllers/bookingController.js";

import { protect, isAdmin } from "../middlewares/auth.js";

const router = express.Router();

router.post("/", protect, createBooking);
router.get("/my", protect, getMyBookings);
router.get("/:id", protect, getBookingById);

router.get("/", protect, isAdmin, getAllBookings);

export default router;
