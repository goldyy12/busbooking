import express from "express";
import { protect } from "../middlewares/auth.js";
import { handleAgentChat } from "../controllers/agentController.js";

const router = express.Router();

router.post("/chat", protect, handleAgentChat);

export default router;
