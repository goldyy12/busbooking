import express from "express";
import {
  register,
  login,
  refreshToken,
} from "../controllers/authController.js";
const {
  googleRedirect,
  googleCallback,
} = require("../controllers/oauthController");

const router = express.Router();
router.get("/google", googleRedirect);
router.get("/google/callback", googleCallback);
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshToken);

export default router;
