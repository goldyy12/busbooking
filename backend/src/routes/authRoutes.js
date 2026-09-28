import express from "express";
import {
  register,
  login,
  refreshToken,
} from "../controllers/authController.js";
import {
  googleRedirect,
  googleCallback,
} from "../controllers/oauthController.js";

const router = express.Router();
router.get("/google", googleRedirect);
router.get("/google/callback", googleCallback);
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshToken);

export default router;
