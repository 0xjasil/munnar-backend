import { Router } from "express";
import { EventController } from "../controllers/event.controller.js";
import { EventRouteController } from "../controllers/event-route.controller.js";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware.js";

const router = Router();

// Public Read Operations
router.get("/", EventController.getAll);
router.get("/:id", EventController.getById);
router.get("/:eventId/routes", EventRouteController.getByEventId);

// Protected Write Operations (Admin, Super Admin, Race Organizer)
const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "ORGANIZER"];
router.post("/", authenticateToken, requireRole(...ADMIN_ROLES), EventController.create);
router.put("/:id", authenticateToken, requireRole(...ADMIN_ROLES), EventController.update);
router.delete("/:id", authenticateToken, requireRole(...ADMIN_ROLES), EventController.delete);

export default router;
