import { Router } from "express";
import prisma from "../config/db.js";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware.js";

const router = Router();
const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "ORGANIZER"];
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 50;

// GET participants (confirmed registrations) with pagination
router.get("/", authenticateToken, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(req.query.limit) || DEFAULT_PAGE_SIZE));
    const skip = (page - 1) * limit;

    const where = { status: "CONFIRMED", paymentStatus: "COMPLETED" };

    const [registrations, total] = await Promise.all([
      prisma.registration.findMany({
        where,
        include: {
          user: true,
          event: true,
          bib: true,
          payments: true
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.registration.count({ where }),
    ]);
    
    // Format to match the frontend AdminParticipant type
    const formatted = registrations.map((r) => {
      const firstName = r.user.fullName.split(" ")[0] || "";
      const lastName = r.user.fullName.split(" ").slice(1).join(" ") || "";
      
      return {
        id: r.registrationNumber || r.id.substring(0, 8),
        dbId: r.id,
        registrationId: r.id,
        initials: firstName.charAt(0) + (lastName.charAt(0) || ""),
        photoTone: "bg-primary/12 text-primary",
        firstName,
        lastName,
        fullName: r.user.fullName,
        email: r.user.email,
        mobile: r.user.mobile || "",
        gender: r.user.gender || "Unknown",
        dob: r.user.dob ? r.user.dob.toISOString() : "1990-01-01",
        age: r.user.dob ? (new Date().getFullYear() - new Date(r.user.dob).getFullYear()) : 30,
        bloodGroup: r.bloodGroup || r.user.bloodGroup || "",
        tshirt: r.tshirtSize,
        city: "Unknown",
        state: "Unknown",
        pincode: "",
        country: r.country || r.user.nationality || "India",
        addressLine: r.user.address || "",
        emergencyName: r.emergencyName || r.user.emergencyName || "Not provided",
        emergencyRelation: "Emergency Contact",
        emergencyPhone: r.emergencyPhone || r.user.emergencyPhone || "Not provided",
        medicalNotes: r.user.medicalConditions || "None reported",
        eventId: r.eventId,
        eventName: r.event.title,
        category: r.event.title,
        ticket: r.tier || "standard",
        bib: r.bib?.bibNumber || null,
        paymentStatus: "paid",
        approval: "approved",
        checkIn: r.checkInStatus === "NOT_CHECKED_IN" ? "pending" : r.checkInStatus.toLowerCase().replace("_", "-"),
        certificate: r.certificateStatus.toLowerCase(),
        amount: r.subtotal,
        tax: r.taxes,
        registeredAt: r.createdAt.toISOString(),
        club: "Independent",
        wave: "Wave 1",
        startTime: r.event.startTime || "06:00 AM",
        chipId: r.bib?.bibNumber ? `CHIP-${r.bib.bibNumber}` : "",
        finishTime: null,
        pace: null,
        ageRank: null,
        overallRank: null,
        payments: r.payments.map(p => ({
          id: p.invoiceId,
          date: p.createdAt.toISOString(),
          description: `Registration for ${r.event.title}`,
          method: p.paymentMethod,
          amount: p.amount,
          status: p.status.toLowerCase()
        })),
        activity: [],
        notes: ""
      };
    });
    
    res.json({
      success: true,
      data: formatted,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET a single participant by ID
router.get("/:id", authenticateToken, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    const r = await prisma.registration.findFirst({
      where: { 
        OR: [{ registrationNumber: id }, { id: id }],
        status: "CONFIRMED",
        paymentStatus: "COMPLETED"
      },
      include: {
        user: true,
        event: true,
        bib: true,
        payments: true
      }
    });

    if (!r) return res.status(404).json({ success: false, message: "Participant not found" });

    const firstName = r.user.fullName.split(" ")[0] || "";
    const lastName = r.user.fullName.split(" ").slice(1).join(" ") || "";
    
    // We'll use the age stored on the Registration model if it exists, otherwise fall back to calculation
    const ageFromDb = r.age !== null ? r.age : (r.user.dob ? (new Date().getFullYear() - new Date(r.user.dob).getFullYear()) : 30);
    
    const formatted = {
      id: r.registrationNumber || r.id.substring(0, 8),
      dbId: r.id,
      registrationId: r.id,
      initials: firstName.charAt(0) + (lastName.charAt(0) || ""),
      photoTone: "bg-primary/12 text-primary",
      firstName,
      lastName,
      fullName: r.user.fullName,
      email: r.user.email,
      mobile: r.user.mobile || "",
      gender: r.user.gender || "Unknown",
      dob: r.dob ? r.dob.toISOString().split('T')[0] : (r.user.dob ? r.user.dob.toISOString().split('T')[0] : "1990-01-01"),
      age: ageFromDb,
      bloodGroup: r.bloodGroup || r.user.bloodGroup || "",
      tshirt: r.tshirtSize,
      city: "Unknown",
      state: "Unknown",
      pincode: "",
      country: r.country || r.user.nationality || "India",
      addressLine: r.user.address || "Not provided",
      emergencyName: r.emergencyName || r.user.emergencyName || "Not provided",
      emergencyRelation: "Emergency Contact",
      emergencyPhone: r.emergencyPhone || r.user.emergencyPhone || "Not provided",
      medicalNotes: r.user.medicalConditions || "None reported",
      eventId: r.eventId,
      eventName: r.event.title,
      category: r.event.title,
      ticket: r.tier || "standard",
      bib: r.bib?.bibNumber || null,
      paymentStatus: "paid",
      approval: "approved",
      checkIn: r.checkInStatus === "NOT_CHECKED_IN" ? "pending" : r.checkInStatus.toLowerCase().replace("_", "-"),
      certificate: r.certificateStatus.toLowerCase(),
      amount: r.subtotal,
      tax: r.taxes,
      registeredAt: r.createdAt.toISOString(),
      club: "Independent",
      wave: "Wave 1",
      startTime: r.event.startTime || "06:00 AM",
      chipId: r.bib?.bibNumber ? `CHIP-${r.bib.bibNumber}` : "",
      finishTime: null,
      pace: null,
      ageRank: null,
      overallRank: null,
      payments: r.payments.map(p => ({
        id: p.invoiceId,
        date: p.createdAt.toISOString(),
        description: `Registration for ${r.event.title}`,
        method: p.paymentMethod,
        amount: p.amount,
        status: p.status.toLowerCase()
      })),
      activity: [],
      notes: "",
      registration: {
        idProof: r.idProofUrl ? { name: "id_proof", type: "image", size: "Unknown", uploaded: r.createdAt.toISOString().split('T')[0], url: `http://localhost:5000${r.idProofUrl}` } : null,
        medicalCertificate: r.certificateUrl ? { name: "medical_cert", type: "image", size: "Unknown", uploaded: r.createdAt.toISOString().split('T')[0], url: `http://localhost:5000${r.certificateUrl}` } : null,
        paymentMethod: r.payments?.[0]?.paymentMethod || "Online"
      }
    };
    
    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT Check-in
router.put("/:id/checkin", authenticateToken, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // CHECKED_IN, NO_SHOW, NOT_CHECKED_IN
    
    const reg = await prisma.registration.findFirst({
      where: { OR: [{ registrationNumber: id }, { id: id }] }
    });
    
    if (!reg) return res.status(404).json({ success: false, message: "Participant not found" });
    
    await prisma.registration.update({
      where: { id: reg.id },
      data: { checkInStatus: status }
    });
    
    res.json({ success: true, message: `Check-in status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST Generate Bib
router.post("/:id/bib", authenticateToken, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    
    const reg = await prisma.registration.findFirst({
      where: { OR: [{ registrationNumber: id }, { id: id }] },
      include: { bib: true }
    });
    
    if (!reg) return res.status(404).json({ success: false, message: "Participant not found" });
    if (reg.bib) return res.status(400).json({ success: false, message: "Bib already assigned" });

    // Generate random bib for simplicity: MM-[4 digits]
    const bibNumber = "MM-" + Math.floor(1000 + Math.random() * 9000);
    
    const bib = await prisma.bibNumber.create({
      data: {
        registrationId: reg.id,
        bibNumber: bibNumber,
        category: reg.tier || "Standard"
      }
    });
    
    res.json({ success: true, bib: bib.bibNumber, message: "Bib generated" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT Certificate
router.put("/:id/certificate", authenticateToken, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // e.g., ISSUED
    
    const reg = await prisma.registration.findFirst({
      where: { OR: [{ registrationNumber: id }, { id: id }] }
    });
    
    if (!reg) return res.status(404).json({ success: false, message: "Participant not found" });
    
    await prisma.registration.update({
      where: { id: reg.id },
      data: { certificateStatus: status }
    });
    
    res.json({ success: true, message: `Certificate status updated to ${status}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
