
import { Router } from "express";
import prisma from "../config/db.js";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware.js";

const router = Router();
const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "ORGANIZER"];

// GET /api/v1/gallery
router.get("/", async (req, res) => {
  try {
    const images = await prisma.galleryImage.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: images });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/gallery
router.post("/", authenticateToken, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { imageUrl, span, altText } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ success: false, message: "Image URL is required" });
    }
    const newImage = await prisma.galleryImage.create({
      data: { imageUrl, span, altText },
    });
    res.status(201).json({ success: true, data: newImage });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/gallery/:id
router.delete("/:id", authenticateToken, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.galleryImage.delete({ where: { id } });
    res.json({ success: true, message: "Image deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
