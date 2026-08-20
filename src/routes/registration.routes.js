import { Router } from "express";
import prisma from "../config/db.js";
import { RegistrationController } from "../controllers/registration.controller.js";

// Importing from the original V1 middlewares to avoid duplication during testing
import { authenticateToken, requireRole } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();
const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "ORGANIZER"];

const isOwnerOrAdmin = async (req, res, next) => {
  try {
    const isAdmin = req.user && req.user.role && ADMIN_ROLES.includes(req.user.role);
    if (isAdmin) return next();
    
    const regId = req.params.id;
    const reg = await prisma.registration.findFirst({
      where: { OR: [{ id: regId }, { registrationNumber: regId }] }
    });
    
    if (!reg) {
      return res.status(404).json({ success: false, message: "Registration not found" });
    }
    
    if (reg.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: "You do not have permission to access this registration" });
    }
    
    next();
  } catch (err) {
    next(err);
  }
};

// GET all registrations
router.get("/", authenticateToken, RegistrationController.getAll);

// POST create a new registration
router.post(
  "/", 
  authenticateToken, 
  upload.fields([{ name: 'idProof', maxCount: 1 }, { name: 'certificate', maxCount: 1 }]), 
  RegistrationController.create
);

// GET a specific registration
router.get("/:id", authenticateToken, isOwnerOrAdmin, RegistrationController.getById);

// PUT to update a registration (e.g. payment success)
router.put("/:id", authenticateToken, isOwnerOrAdmin, RegistrationController.update);

// PUT to update approval status (Admin only)
router.put("/:id/approval", authenticateToken, requireRole(...ADMIN_ROLES), RegistrationController.updateApproval);

// PUT upload documents for existing registration
router.put(
  "/:id/documents", 
  authenticateToken, 
  isOwnerOrAdmin,
  upload.fields([{ name: 'idProof', maxCount: 1 }, { name: 'certificate', maxCount: 1 }]), 
  RegistrationController.uploadDocuments
);

// DELETE a registration (Admin only)
router.delete("/:id", authenticateToken, requireRole(...ADMIN_ROLES), RegistrationController.delete);

export default router;
