import { Router } from "express";
import prisma from "../config/db.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

// GET /api/v1/testimonials - Public (Published testimonials only)
router.get("/", async (req, res) => {
  try {
    const testimonials = await prisma.testimonial.findMany({
      where: { isPublished: true },
      orderBy: [
        { displayOrder: "asc" },
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        userId: true,
        name: true,
        designation: true,
        company: true,
        message: true,
        imageUrl: true,
        displayOrder: true,
        createdAt: true,
      },
    });
    res.json({ success: true, data: testimonials });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/testimonials/all - Admin Protected (Get all testimonials)
router.get("/all", authenticateToken, async (req, res) => {
  try {
    const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(req.user.roleName || req.user.role);
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const testimonials = await prisma.testimonial.findMany({
      orderBy: [
        { displayOrder: "asc" },
        { createdAt: "desc" },
      ],
    });
    res.json({ success: true, data: testimonials });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/testimonials/my - Authenticated user's submitted testimonials
router.get("/my", authenticateToken, async (req, res) => {
  try {
    const myTestimonials = await prisma.testimonial.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: myTestimonials });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/testimonials - Authenticated user submit testimonial
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { name, designation, company, message, imageUrl, isPublished } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Testimonial message is required" });
    }

    const newTestimonial = await prisma.testimonial.create({
      data: {
        userId: req.user.id, // Strictly derived from JWT auth token
        name: name || req.user.fullName || "Anonymous Runner",
        designation: designation || "Runner",
        company: company || null,
        message: message.trim(),
        imageUrl: imageUrl || req.user.avatarUrl || null,
        isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
      },
    });

    res.status(201).json({ success: true, data: newTestimonial, message: "Testimonial submitted successfully!" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/testimonials/:id - Authenticated user / admin edit testimonial
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, designation, company, message, imageUrl, isPublished, displayOrder } = req.body;

    const existing = await prisma.testimonial.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Testimonial not found" });
    }

    const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(req.user.roleName || req.user.role);
    if (existing.userId !== req.user.id && !isAdmin) {
      return res.status(403).json({ success: false, message: "You can only edit your own testimonial" });
    }

    const updated = await prisma.testimonial.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(designation !== undefined && { designation }),
        ...(company !== undefined && { company }),
        ...(message !== undefined && { message: message.trim() }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isPublished !== undefined && { isPublished: Boolean(isPublished) }),
        ...(displayOrder !== undefined && { displayOrder: Number(displayOrder) }),
      },
    });

    res.json({ success: true, data: updated, message: "Testimonial updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// DELETE /api/v1/testimonials/:id - Authenticated user delete own testimonial
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.testimonial.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: "Testimonial not found" });
    }

    const isAdmin = ["SUPER_ADMIN", "ADMIN"].includes(req.user.roleName || req.user.role);
    if (existing.userId !== req.user.id && !isAdmin) {
      return res.status(403).json({ success: false, message: "You can only delete your own testimonial" });
    }

    await prisma.testimonial.delete({ where: { id } });
    res.json({ success: true, message: "Testimonial deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
