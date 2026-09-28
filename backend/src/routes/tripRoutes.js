import express from "express";
import {
  createTrip,
  getAllTrips,
  getTripById,
  searchTrips,
} from "../controllers/tripController.js";

import { protect, isAdmin } from "../middlewares/auth.js";

const router = express.Router();
router.get("/", getAllTrips);
router.get("/search", searchTrips);
router.get("/:id", getTripById);
router.post("/", protect, isAdmin, createTrip);

export default router;
