import { Router } from "express";
import { EventCategoryController } from "../controllers/event-category.controller.js";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware.js";

const router = Router();

// Public Read Endpoints
router.get("/", EventCategoryController.getAll);
router.get("/:id", EventCategoryController.getById);

// Protected Write Endpoints (Admin, Super Admin, Race Organizer)
const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "ORGANIZER"];
router.post("/", authenticateToken, requireRole(...ADMIN_ROLES), EventCategoryController.create);
router.put("/:id", authenticateToken, requireRole(...ADMIN_ROLES), EventCategoryController.update);
router.delete("/:id", authenticateToken, requireRole(...ADMIN_ROLES), EventCategoryController.delete);

export default router;
