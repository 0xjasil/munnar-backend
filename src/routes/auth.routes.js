import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

// Signup / Register
router.post("/register", AuthController.register);
router.post("/signup", AuthController.register);

// Google Auth
router.post("/google", AuthController.googleLogin);

// Email / OTP Verification
router.post("/verify-email", AuthController.verifyEmail);
router.post("/verify-otp", AuthController.verifyEmail);
router.post("/resend-otp", AuthController.resendOTP);

// Login & Session
router.post("/login", AuthController.login);
router.post("/refresh", AuthController.refresh);
router.post("/logout", AuthController.logout);
router.get("/profile", authenticateToken, AuthController.getProfile);
router.get("/me", authenticateToken, AuthController.getProfile);

// Password Recovery
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/verify-reset-otp", AuthController.verifyResetOTP);
router.post("/reset-password", AuthController.resetPassword);
router.put("/change-password", authenticateToken, AuthController.changePassword);

export default router;
