import { Router } from "express";
import prisma from "../config/db.js";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware.js";

const router = Router();
const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "ORGANIZER"];
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;

// GET all bib settings
router.get("/settings", authenticateToken, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const settings = await prisma.bibSetting.findMany({
      orderBy: { category: "asc" }
    });
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT update a bib setting
router.put("/settings/:id", authenticateToken, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    const { category, prefix, startNumber, currentNumber, digits } = req.body;

    const setting = await prisma.bibSetting.upsert({
      where: { id },
      update: { category, prefix, startNumber, currentNumber, digits },
      create: { id, category, prefix, startNumber, currentNumber, digits }
    });
    
    res.json({ success: true, data: setting, message: "Setting saved" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET all bibs for dashboard (with pagination)
router.get("/", authenticateToken, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.limit) || DEFAULT_PAGE_SIZE));
    const skip = (page - 1) * limit;

    const [bibs, total] = await Promise.all([
      prisma.bibNumber.findMany({
        include: {
          registration: {
            select: {
              eventId: true,
              registrationNumber: true,
              userId: true,
              bloodGroup: true,
              emergencyPhone: true,
              user: { select: { fullName: true, bloodGroup: true, emergencyPhone: true } },
              event: { select: { title: true } },
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.bibNumber.count(),
    ]);

    const formatted = bibs.map(b => ({
      id: b.id,
      number: b.bibNumber,
      eventId: b.registration?.eventId || "unassigned",
      eventName: b.registration?.event?.title || b.category,
      category: b.category,
      participantName: b.registration?.user?.fullName || null,
      participantInitials: b.registration?.user?.fullName ? b.registration.user.fullName.substring(0, 2).toUpperCase() : null,
      participantId: b.registration?.userId || null,
      registrationId: b.registration?.registrationNumber || b.registrationId,
      status: b.status.toLowerCase(),
      printStatus: b.qrCode ? "printed" : "not-printed",
      assignedDate: b.createdAt.toISOString().split("T")[0],
      bloodGroup: b.registration?.bloodGroup || b.registration?.user?.bloodGroup || null,
      emergencyContact: b.registration?.emergencyPhone || b.registration?.user?.emergencyPhone || null,
    }));
    
    res.json({
      success: true,
      data: formatted,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST generate/assign bib — BULK optimized (no N+1 loops)
router.post("/assign", authenticateToken, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { registrationIds } = req.body;
    if (!registrationIds || !Array.isArray(registrationIds)) {
      return res.status(400).json({ success: false, message: "registrationIds must be an array" });
    }

    // 1. Fetch ALL matching registrations in ONE query
    const registrations = await prisma.registration.findMany({
      where: {
        OR: [
          { registrationNumber: { in: registrationIds } },
          { id: { in: registrationIds } },
        ],
      },
      include: { event: true, bib: true },
    });

    // 2. Filter out registrations that already have a bib
    const needsBib = registrations.filter(r => !r.bib);
    const skipped = [];

    // 3. Collect unique category names needed and fetch ALL settings in ONE query
    const categoryNames = new Set();
    for (const reg of needsBib) {
      categoryNames.add(reg.tier || reg.event.title);
      if (reg.tier) categoryNames.add(reg.event.title); // fallback category
    }
    const allSettings = await prisma.bibSetting.findMany({
      where: { category: { in: [...categoryNames] } },
    });
    const settingsMap = new Map(allSettings.map(s => [s.category, { ...s }]));

    // 4. Fetch ALL existing bib numbers to check for collisions in memory
    const existingBibs = await prisma.bibNumber.findMany({
      select: { bibNumber: true },
    });
    const existingBibSet = new Set(existingBibs.map(b => b.bibNumber));

    // 5. Generate bib numbers in memory
    const bibsToCreate = [];
    const settingUpdates = new Map(); // settingId -> newCurrentNumber

    for (const reg of needsBib) {
      const categoryName = reg.tier || reg.event.title;
      let setting = settingsMap.get(categoryName);
      // Fallback: if tier setting not found, try event title
      if (!setting && reg.tier) {
        setting = settingsMap.get(reg.event.title);
      }
      if (!setting) {
        skipped.push({ regId: reg.registrationNumber || reg.id, reason: `No bib setting for "${categoryName}" or "${reg.event.title}"` });
        continue;
      }

      // Use the in-memory counter (tracks increments across the batch)
      let currentNum = settingUpdates.has(setting.id)
        ? settingUpdates.get(setting.id)
        : setting.currentNumber;

      let bibNumber = "";
      // Find next unique number
      while (true) {
        const paddedNumber = String(currentNum).padStart(setting.digits, "0");
        bibNumber = setting.prefix ? `${setting.prefix}-${paddedNumber}` : paddedNumber;
        if (!existingBibSet.has(bibNumber)) break;
        currentNum++;
      }

      bibsToCreate.push({
        registrationId: reg.id,
        bibNumber,
        category: categoryName,
        status: "ASSIGNED",
      });
      existingBibSet.add(bibNumber); // prevent duplicates within the same batch
      settingUpdates.set(setting.id, currentNum + 1);
    }

    // 6. Execute all writes inside a single transaction
    let assigned = [];
    if (bibsToCreate.length > 0) {
      assigned = await prisma.$transaction(async (tx) => {
        // Bulk create all bibs
        await tx.bibNumber.createMany({ data: bibsToCreate });

        // Update all affected bib settings
        for (const [settingId, newCurrent] of settingUpdates) {
          await tx.bibSetting.update({
            where: { id: settingId },
            data: { currentNumber: newCurrent },
          });
        }

        // Fetch the created bibs to return
        return tx.bibNumber.findMany({
          where: { bibNumber: { in: bibsToCreate.map(b => b.bibNumber) } },
        });
      });
    }

    res.json({ 
      success: true, 
      message: `Assigned ${assigned.length} bibs. Skipped ${skipped.length}.`, 
      data: assigned,
      skipped
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT mark bibs as printed
router.put("/print", authenticateToken, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { bibIds } = req.body;
    if (!bibIds || !Array.isArray(bibIds)) {
      return res.status(400).json({ success: false, message: "bibIds must be an array" });
    }

    // Set qrCode to a static placeholder to indicate it's printed (if real QR gen isn't added yet)
    await prisma.bibNumber.updateMany({
      where: { id: { in: bibIds } },
      data: { qrCode: "printed" }
    });

    res.json({ success: true, message: `Marked ${bibIds.length} bibs as printed` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Helper to extract code if a full URL is scanned
function extractCode(rawInput) {
  if (!rawInput) return "";
  let clean = String(rawInput).trim();
  // If it's a URL (e.g., http://localhost:5173/checkin/MM-1001 or https://munnarmarathon.com/checkin/MM-1001)
  if (clean.includes("/checkin/")) {
    clean = clean.split("/checkin/").pop().split("?")[0].split("#")[0];
  } else if (clean.includes("/")) {
    clean = clean.split("/").pop().split("?")[0].split("#")[0];
  }
  return decodeURIComponent(clean).trim();
}

// GET /api/v1/bibs/scan/:code — Verify / Scan a runner bib or registration QR code
router.get("/scan/:code", async (req, res) => {
  try {
    const rawCode = req.params.code;
    const code = extractCode(rawCode);

    if (!code) {
      return res.status(400).json({ success: false, message: "Invalid or empty code" });
    }

    const reg = await prisma.registration.findFirst({
      where: {
        OR: [
          { bib: { bibNumber: { equals: code, mode: "insensitive" } } },
          { registrationNumber: { equals: code, mode: "insensitive" } },
          { id: code },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            mobile: true,
            gender: true,
            bloodGroup: true,
            emergencyName: true,
            emergencyPhone: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            location: true,
            distance: true,
            startTime: true,
          },
        },
        bib: true,
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!reg) {
      return res.status(404).json({
        success: false,
        message: `No participant or bib found matching "${code}"`,
      });
    }

    const formatted = {
      id: reg.registrationNumber || reg.id,
      dbId: reg.id,
      registrationId: reg.id,
      registrationNumber: reg.registrationNumber || reg.id,
      bibNumber: reg.bib?.bibNumber || "PENDING",
      category: reg.tier || reg.event?.title || "Standard",
      status: reg.status,
      checkInStatus: reg.checkInStatus,
      isCollected: reg.checkInStatus === "CHECKED_IN",
      approval: reg.status === "CONFIRMED" ? "Confirmed" : reg.status,
      tshirtSize: reg.tshirtSize,
      bloodGroup: reg.bloodGroup || reg.user?.bloodGroup || "Not specified",
      emergencyName: reg.emergencyName || reg.user?.emergencyName || "Emergency Contact",
      emergencyPhone: reg.emergencyPhone || reg.user?.emergencyPhone || "N/A",
      user: {
        fullName: reg.user?.fullName || "Runner",
        email: reg.user?.email || "",
        mobile: reg.user?.mobile || "",
        gender: reg.user?.gender || "Unknown",
      },
      event: {
        title: reg.event?.title || "Munnar Marathon 2027",
        date: reg.event?.date ? reg.event.date.toISOString() : "2027-02-14",
        location: reg.event?.location || "Munnar, Kerala",
        distance: reg.event?.distance || "Marathon",
        startTime: reg.event?.startTime || "06:00 AM",
      },
    };

    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/bibs/scan/checkin — Fast Check-in from QR scan
router.post("/scan/checkin", async (req, res) => {
  try {
    const { code, targetId } = req.body;
    const identifier = targetId || extractCode(code);

    if (!identifier) {
      return res.status(400).json({ success: false, message: "Target ID or Code is required" });
    }

    const reg = await prisma.registration.findFirst({
      where: {
        OR: [
          { id: identifier },
          { registrationNumber: { equals: identifier, mode: "insensitive" } },
          { bib: { bibNumber: { equals: identifier, mode: "insensitive" } } },
        ],
      },
    });

    if (!reg) {
      return res.status(404).json({ success: false, message: "Registration not found" });
    }

    const updated = await prisma.registration.update({
      where: { id: reg.id },
      data: { checkInStatus: "CHECKED_IN" },
      include: {
        user: true,
        event: true,
        bib: true,
      },
    });

    res.json({
      success: true,
      message: `Runner ${updated.user?.fullName || ""} (${updated.bib?.bibNumber || reg.registrationNumber}) checked in successfully!`,
      data: {
        id: updated.id,
        checkInStatus: updated.checkInStatus,
        bibNumber: updated.bib?.bibNumber,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
