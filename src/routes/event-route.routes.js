import { Router } from "express";
import { EventRouteController } from "../controllers/event-route.controller.js";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware.js";

const router = Router();

// Public Read Operations
router.get("/", EventRouteController.getAll);
router.get("/:id", EventRouteController.getById);

// Protected Write Operations (Admin, Super Admin, Race Organizer)
const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "ORGANIZER"];
router.post("/", authenticateToken, requireRole(...ADMIN_ROLES), EventRouteController.create);
router.put("/:id", authenticateToken, requireRole(...ADMIN_ROLES), EventRouteController.update);
router.delete("/:id", authenticateToken, requireRole(...ADMIN_ROLES), EventRouteController.delete);

export default router;
