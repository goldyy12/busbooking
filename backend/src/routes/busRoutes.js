import express from "express";
import {
  createBus,
  getAllBuses,
  updateBus,
} from "../controllers/busController.js";

import { protect, isAdmin } from "../middlewares/auth.js";

const router = express.Router();

/**
 * ADMIN ONLY
 */
router.post("/", protect, isAdmin, createBus);
router.put("/:id", protect, isAdmin, updateBus);

/**
 * PUBLIC / USER
 */
router.get("/", getAllBuses);

export default router;
