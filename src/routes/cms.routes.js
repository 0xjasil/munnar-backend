import { Router } from "express";
import prisma from "../config/db.js";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware.js";

const router = Router();
const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "ORGANIZER"];

/* -------------------------------------------------------------------------- */
/* HOMEPAGE HERO ENDPOINTS                                                    */
/* -------------------------------------------------------------------------- */

// GET /api/v1/cms/hero - Public
router.get("/hero", async (req, res) => {
  try {
    let hero = await prisma.homepageHero.findFirst();
    if (!hero) {
      // Create initial default record if none exists
      hero = await prisma.homepageHero.create({
        data: {
          badgeText: "Kerala · India · 17 Jan 2027",
          badgePill: "World Athletics & AIMS Certified",
          title: "Munnar",
          highlightTitle: "Marathon",
          description: "Run through the heart of nature a soulful course of tea hills, mist and morning light.",
          imageUrl: "",
          ctaText: "Reserve Your Bib",
          ctaUrl: "#register",
          videoUrl: "",
        },
      });
    }
    res.json({ success: true, data: hero });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/cms/hero - Admin Protected
router.put("/hero", authenticateToken, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { badgeText, badgePill, title, highlightTitle, description, imageUrl, ctaText, ctaUrl, videoUrl } = req.body;
    let hero = await prisma.homepageHero.findFirst();
    if (hero) {
      hero = await prisma.homepageHero.update({
        where: { id: hero.id },
        data: {
          badgeText,
          badgePill,
          title,
          highlightTitle,
          description,
          imageUrl,
          ctaText,
          ctaUrl,
          videoUrl,
        },
      });
    } else {
      hero = await prisma.homepageHero.create({
        data: {
          badgeText,
          badgePill,
          title,
          highlightTitle,
          description,
          imageUrl,
          ctaText,
          ctaUrl,
          videoUrl,
        },
      });
    }
    res.json({ success: true, data: hero, message: "Homepage Hero updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* -------------------------------------------------------------------------- */
/* SPONSOR CMS ENDPOINTS                                                      */
/* -------------------------------------------------------------------------- */

// GET /api/v1/cms/sponsors - Public (Active sponsors sorted by order)
router.get("/sponsors", async (req, res) => {
  try {
    const sponsors = await prisma.sponsor.findMany({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
    });
    res.json({ success: true, data: sponsors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/cms/sponsors/all - Admin Protected
router.get("/sponsors/all", authenticateToken, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const sponsors = await prisma.sponsor.findMany({
      orderBy: { displayOrder: "asc" },
    });
    res.json({ success: true, data: sponsors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/cms/sponsors - Admin Protected
router.post("/sponsors", authenticateToken, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { name, logoUrl, websiteUrl, tier, displayOrder, active } = req.body;
    if (!name || !logoUrl) {
      return res.status(400).json({ success: false, message: "Sponsor name and logo URL are required" });
    }
    const sponsor = await prisma.sponsor.create({
      data: {
        name,
        logoUrl,
        websiteUrl: websiteUrl || null,
        tier: tier || "Performance",
        displayOrder: displayOrder !== undefined ? Number(displayOrder) : 0,
        active: active !== undefined ? Boolean(active) : true,
      },
    });
    res.status(201).json({ success: true, data: sponsor, message: "Sponsor added successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/v1/cms/sponsors/:id - Admin Protected
router.put("/sponsors/:id", authenticateToken, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, logoUrl, websiteUrl, tier, displayOrder, active } = req.body;
    const updated = await prisma.sponsor.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(websiteUrl !== undefined && { websiteUrl }),
        ...(tier !== undefined && { tier }),
        ...(displayOrder !== undefined && { displayOrder: Number(displayOrder) }),
        ...(active !== undefined && { active: Boolean(active) }),
      },
    });
    res.json({ success: true, data: updated, message: "Sponsor updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// DELETE /api/v1/cms/sponsors/:id - Admin Protected
router.delete("/sponsors/:id", authenticateToken, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.sponsor.delete({ where: { id } });
    res.json({ success: true, message: "Sponsor deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
