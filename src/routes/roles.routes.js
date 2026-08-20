import { Router } from "express";
import {
  getAllUsers,
  getDashboardMetrics,
  updateUserRole,
  updateUserProfile,
  toggleUserStatus,
  resetUserPassword,
  createTeamMember,
  getRolePermissions,
  createRole,
  updateRole,
  deleteRole,
} from "../controllers/roles.controller.js";
import { authenticateToken, requireRole } from "../middlewares/auth.middleware.js";

const router = Router();

// Public / Read-only admin data routes for UI display
router.get("/dashboard", authenticateToken, requireRole("SUPER_ADMIN", "ADMIN"), getDashboardMetrics);
router.get("/users", authenticateToken, requireRole("SUPER_ADMIN", "ADMIN"), getAllUsers);
router.get("/permissions", authenticateToken, requireRole("SUPER_ADMIN", "ADMIN"), getRolePermissions);

// Write / Modify operations: strictly protected with Auth & Roles
router.put("/users/:userId", authenticateToken, requireRole("SUPER_ADMIN", "ADMIN"), updateUserProfile);
router.put("/users/:userId/role", authenticateToken, requireRole("SUPER_ADMIN"), updateUserRole);
router.put("/users/:userId/status", authenticateToken, requireRole("SUPER_ADMIN", "ADMIN"), toggleUserStatus);
router.put("/users/:userId/reset-password", authenticateToken, requireRole("SUPER_ADMIN", "ADMIN"), resetUserPassword);
router.post("/users", authenticateToken, requireRole("SUPER_ADMIN", "ADMIN"), createTeamMember);
router.post("/roles", authenticateToken, requireRole("SUPER_ADMIN"), createRole);
router.put("/roles/:roleId", authenticateToken, requireRole("SUPER_ADMIN"), updateRole);
router.delete("/roles/:roleId", authenticateToken, requireRole("SUPER_ADMIN"), deleteRole);

export default router;
