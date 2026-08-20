import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import rolesRoutes from "./routes/roles.routes.js";
import eventCategoryRoutes from "./routes/event-category.routes.js";
import eventRoutes from "./routes/event.routes.js";
import eventRouteRoutes from "./routes/event-route.routes.js";
import galleryRoutes from "./routes/gallery.routes.js";
import registrationRoutes from "./routes/registration.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import participantRoutes from "./routes/participant.routes.js";
import bibRoutes from "./routes/bib.routes.js";
import cmsRoutes from "./routes/cms.routes.js";
import testimonialRoutes from "./routes/testimonial.routes.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";

// V2 Imports
// import registrationRoutesV2 from "./routes/registration.routes.js";
// import paymentRoutesV2 from "./routes/payment.routes.js";
// import authRoutesV2 from "./v2/modules/auth/routes/auth.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS setup
const allowedOrigins = (process.env.CORS_ORIGIN || "*")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes("*")) {
        return callback(null, true);
      }
      const normalizedOrigin = origin.replace(/\/$/, "");
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive fallback
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Munnar Marathon Production API",
    time: new Date().toISOString(),
  });
});

// Feature-Based API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/admin", rolesRoutes);
app.use("/api/v1/event-categories", eventCategoryRoutes);
app.use("/api/v1/events", eventRoutes);
app.use("/api/v1/event-routes", eventRouteRoutes);
app.use("/api/v1/gallery", galleryRoutes);
app.use("/api/v1/registrations", registrationRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/participants", participantRoutes);
app.use("/api/v1/bibs", bibRoutes);
app.use("/api/v1/cms", cmsRoutes);
app.use("/api/v1/testimonials", testimonialRoutes);



// V2 Feature-Based API Routes
// app.use("/api/v2/registrations", registrationRoutesV2);
// app.use("/api/v2/payments", paymentRoutesV2);
// app.use("/api/v2/auth", authRoutesV2);

// QZ Tray Hardware Printing Integration
app.post("/qz/sign", (req, res) => {
  try {
    // QZ Tray sends the string to sign either in req.body or as plain text
    const requestToSign = req.body?.request || req.body || "";
    if (typeof requestToSign !== "string" || !requestToSign.trim()) {
      return res.status(400).send("Request string is required for signing");
    }

    // Restrict payloads: only allow pre-defined/whitelisted templates or QZ challenges
    const allowedPrefixes = ["^XA", "-----BEGIN", "http://", "https://", "Munnar"];
    const isWhitelisted = allowedPrefixes.some(prefix => requestToSign.startsWith(prefix));
    
    if (!isWhitelisted) {
      return res.status(403).send("Payload rejected: Only pre-defined/whitelisted templates are permitted.");
    }

    const keyPath = path.join(__dirname, "qz-cert", "private-key.pem");
    if (!fs.existsSync(keyPath)) {
      // For development, if key doesn't exist, log warning and return mock
      console.warn("⚠️ QZ Tray private key not found at:", keyPath);
      return res.send("mock_signature_for_development");
    }

    const privateKey = fs.readFileSync(keyPath, "utf8");
    const signature = crypto.createSign("SHA512").update(requestToSign).sign(privateKey, "base64");
    
    // QZ Tray expects plain text response for the signature
    res.set('Content-Type', 'text/plain');
    res.send(signature);
  } catch (error) {
    console.error("❌ QZ Sign Error:", error);
    res.status(500).send("Signing failed");
  }
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Munnar Marathon Backend running on http://localhost:${PORT}`);
});

export default app;
