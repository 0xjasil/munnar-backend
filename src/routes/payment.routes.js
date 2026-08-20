import { Router } from "express";
import crypto from "crypto";
import { PaymentController } from "../controllers/payment.controller.js";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware.js";

const router = Router();
const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "ORGANIZER"];

const verifyWebhookSignature = (req, res, next) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "default_webhook_secret";
  const signature = req.headers['x-razorpay-signature'];
  
  if (!signature) {
    return res.status(401).json({ success: false, message: "Missing webhook signature" });
  }
  
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(req.body))
    .digest("hex");
    
  if (signature !== expectedSignature) {
    return res.status(400).json({ success: false, message: "Invalid webhook signature" });
  }
  
  next();
};

// GET all payments for admin
router.get("/", authenticateToken, requireRole(...ADMIN_ROLES), PaymentController.getAll);

// POST Webhook for payment gateway
router.post("/webhook", verifyWebhookSignature, PaymentController.webhook);

export default router;
