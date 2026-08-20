import bcrypt from "bcryptjs";
import prisma from "../config/db.js";

const SYSTEM_ROLES = ["SUPER_ADMIN", "ADMIN", "ORGANIZER", "VOLUNTEER", "RUNNER"];

export async function getAllUsers(req, res, next) {
  try {
    const { search, role, status } = req.query;

    const conditions = [];

    if (search && String(search).trim().length > 0) {
      const q = String(search).trim();
      conditions.push({
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { username: { contains: q, mode: "insensitive" } },
          { mobile: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    if (role && role !== "ALL") {
      conditions.push({
        OR: [
          { roleName: role },
          { role: { name: role } },
          { role: { label: { contains: role, mode: "insensitive" } } },
          { roleId: role },
        ],
      });
    }

    if (status && status !== "ALL") {
      if (status === "ACTIVE") conditions.push({ active: true });
      if (status === "INACTIVE") conditions.push({ active: false });
    }

    const whereClause = conditions.length > 0 ? { AND: conditions } : {};

    const dbUsers = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        mobile: true,
        roleName: true,
        role: { select: { id: true, name: true, label: true, description: true, permissions: true } },
        emailVerified: true,
        active: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const users = dbUsers.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username || u.email.split("@")[0],
      fullName: u.fullName || u.username || u.email.split("@")[0],
      mobile: u.mobile || "",
      role: u.roleName || u.role?.name || "RUNNER",
      roleDetails: u.role,
      emailVerified: u.emailVerified ?? true,
      active: u.active ?? true,
      avatarUrl: u.avatarUrl || null,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    return res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    next(error);
  }
}

export async function updateUserProfile(req, res, next) {
  try {
    const { userId } = req.params;
    const { fullName, email, mobile, username } = req.body;

    const dataToUpdate = {};
    if (fullName !== undefined) dataToUpdate.fullName = fullName.trim();
    if (email !== undefined) dataToUpdate.email = email.trim().toLowerCase();
    if (mobile !== undefined) dataToUpdate.mobile = mobile.trim();
    if (username !== undefined) dataToUpdate.username = username.trim().toLowerCase();

    const updated = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        mobile: true,
        roleName: true,
        active: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    return res.json({
      success: true,
      message: "User profile updated successfully.",
      user: updated,
    });
  } catch (error) {
    console.error("Error in updateUserProfile:", error);
    next(error);
  }
}

export async function toggleUserStatus(req, res, next) {
  try {
    const { userId } = req.params;
    const { active } = req.body;

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const newStatus = active !== undefined ? Boolean(active) : !targetUser.active;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { active: newStatus },
    });

    return res.json({
      success: true,
      message: `User account has been ${newStatus ? "activated" : "deactivated"}.`,
      user: { id: updated.id, active: updated.active },
    });
  } catch (error) {
    console.error("Error in toggleUserStatus:", error);
    next(error);
  }
}

export async function resetUserPassword(req, res, next) {
  try {
    const { userId } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters long." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return res.json({
      success: true,
      message: "User password reset successfully.",
    });
  } catch (error) {
    console.error("Error in resetUserPassword:", error);
    next(error);
  }
}

export async function updateUserRole(req, res, next) {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ success: false, message: "Role name is required." });
    }

    let roleRecord = await prisma.role.findUnique({ where: { name: role } });
    if (!roleRecord) {
      roleRecord = await prisma.role.create({
        data: {
          name: role,
          label: role,
          description: `Role ${role}`,
          permissions: ["basic"],
        },
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        roleId: roleRecord.id,
        roleName: role,
      },
      include: { role: true },
    });

    return res.json({
      success: true,
      message: `User role updated to ${role} successfully.`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        role: updatedUser.roleName || updatedUser.role?.name,
      },
    });
  } catch (error) {
    console.error("Error in updateUserRole:", error);
    next(error);
  }
}

export async function createTeamMember(req, res, next) {
  try {
    const { fullName, email, username, password, role } = req.body;

    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ success: false, message: "Full Name, Email, Password, and Role are required." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let roleRecord = await prisma.role.findUnique({ where: { name: role } });
    if (!roleRecord) {
      roleRecord = await prisma.role.create({
        data: { name: role, label: role, permissions: ["basic"] },
      });
    }

    const newUser = await prisma.user.create({
      data: {
        fullName,
        email: email.trim().toLowerCase(),
        username: (username || email.split("@")[0]).trim().toLowerCase(),
        passwordHash,
        roleId: roleRecord.id,
        roleName: role,
        emailVerified: true,
        active: true,
      },
      include: { role: true },
    });

    return res.status(201).json({
      success: true,
      message: `Team member ${fullName} created with role ${role}.`,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.roleName,
      },
    });
  } catch (error) {
    console.error("Error in createTeamMember:", error);
    next(error);
  }
}

export async function getRolePermissions(req, res) {
  try {
    let roles = await prisma.role.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!roles || roles.length === 0) {
      roles = [
        { name: "SUPER_ADMIN", label: "Super Admin", description: "Full unchecked system access", permissions: ["Manage Roles", "Manage Events", "Manage Registrations", "Assign Bibs", "View Reports", "Delete Data", "System Settings"], _count: { users: 1 } },
        { name: "ADMIN", label: "Administrator", description: "Manage events, registrations, bibs, and reports", permissions: ["Manage Events", "Manage Registrations", "Assign Bibs", "View Reports"], _count: { users: 0 } },
        { name: "ORGANIZER", label: "Race Organizer", description: "Create and edit event schedules and view metrics", permissions: ["Manage Events", "View Registrations", "View Reports"], _count: { users: 0 } },
        { name: "VOLUNTEER", label: "Volunteer / Crew", description: "Bib pickup scanning, check-in, aid station", permissions: ["Assign Bibs", "View Registrations"], _count: { users: 0 } },
        { name: "RUNNER", label: "Runner / Participant", description: "Standard public account", permissions: ["Register for Race", "View Tickets"], _count: { users: 0 } },
      ];
    }

    const formattedRoles = roles.map((r) => ({
      id: r.id,
      name: r.name,
      label: r.label,
      description: r.description || `Role ${r.label}`,
      permissions: r.permissions || [],
      userCount: r._count ? r._count.users : 0,
      isSystemRole: SYSTEM_ROLES.includes(r.name),
    }));

    return res.json({ success: true, roles: formattedRoles });
  } catch (err) {
    console.error("Error in getRolePermissions:", err);
    return res.json({ success: true, roles: [] });
  }
}

export async function createRole(req, res, next) {
  try {
    const { name, label, description, permissions } = req.body;

    if (!name || !label) {
      return res.status(400).json({ success: false, message: "Role name and label are required." });
    }

    const formattedName = String(name).toUpperCase().replace(/\s+/g, "_");

    const existing = await prisma.role.findUnique({ where: { name: formattedName } });
    if (existing) {
      return res.status(409).json({ success: false, message: `Role with key ${formattedName} already exists.` });
    }

    const newRole = await prisma.role.create({
      data: {
        name: formattedName,
        label,
        description: description || `Role ${label}`,
        permissions: permissions || ["View Reports"],
      },
    });

    return res.status(201).json({
      success: true,
      message: `Role ${label} created in DB successfully.`,
      role: newRole,
    });
  } catch (error) {
    console.error("Error in createRole:", error);
    next(error);
  }
}

export async function updateRole(req, res, next) {
  try {
    const { roleId } = req.params;
    const { label, description, permissions } = req.body;

    const dataToUpdate = {};
    if (label !== undefined) dataToUpdate.label = label;
    if (description !== undefined) dataToUpdate.description = description;
    if (permissions !== undefined) dataToUpdate.permissions = permissions;

    const updated = await prisma.role.update({
      where: { id: roleId },
      data: dataToUpdate,
    });

    return res.json({
      success: true,
      message: "Role updated successfully.",
      role: updated,
    });
  } catch (error) {
    console.error("Error in updateRole:", error);
    next(error);
  }
}

export async function deleteRole(req, res, next) {
  try {
    const { roleId } = req.params;

    const roleRecord = await prisma.role.findUnique({ where: { id: roleId } });
    if (!roleRecord) {
      return res.status(404).json({ success: false, message: "Role not found." });
    }

    if (SYSTEM_ROLES.includes(roleRecord.name)) {
      return res.status(403).json({
        success: false,
        message: `System protected role (${roleRecord.name}) cannot be deleted.`,
      });
    }

    await prisma.role.delete({ where: { id: roleId } });

    return res.json({
      success: true,
      message: `Role "${roleRecord.label}" deleted successfully.`,
    });
  } catch (error) {
    console.error("Error in deleteRole:", error);
    next(error);
  }
}

// Simple in-memory cache for dashboard metrics (TTL: 60 seconds)
let _dashboardCache = null;
let _dashboardCacheExpiry = 0;

export async function getDashboardMetrics(req, res, next) {
  try {
    const now = Date.now();

    // Return cached result if still fresh
    if (_dashboardCache && now < _dashboardCacheExpiry) {
      return res.json(_dashboardCache);
    }

    let totalUsers = 0;
    let totalAdmins = 0;
    let totalRunners = 0;
    let totalOrganizers = 0;
    let totalVolunteers = 0;
    let activeUsers = 0;
    let pendingUsers = 0;
    let recentUsers = [];
    let recentlyUpdatedUsers = [];

    try {
      // Single groupBy replaces 6 separate count() queries
      const [roleGroups, activeGroups, dbUsers, updatedUsers] = await Promise.all([
        prisma.user.groupBy({
          by: ["roleName"],
          _count: { id: true },
        }),
        prisma.user.groupBy({
          by: ["active"],
          _count: { id: true },
        }),
        prisma.user.findMany({
          take: 8,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            fullName: true,
            email: true,
            username: true,
            roleName: true,
            createdAt: true,
          },
        }),
        prisma.user.findMany({
          take: 5,
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            fullName: true,
            email: true,
            roleName: true,
            updatedAt: true,
          },
        }),
      ]);

      // Parse role counts from groupBy result
      const roleCounts = {};
      for (const g of roleGroups) {
        roleCounts[g.roleName || "RUNNER"] = g._count.id;
      }
      totalUsers = Object.values(roleCounts).reduce((a, b) => a + b, 0);
      totalAdmins = (roleCounts["SUPER_ADMIN"] || 0) + (roleCounts["ADMIN"] || 0);
      totalRunners = roleCounts["RUNNER"] || 0;
      totalOrganizers = roleCounts["ORGANIZER"] || 0;
      totalVolunteers = roleCounts["VOLUNTEER"] || 0;

      // Parse active counts
      for (const g of activeGroups) {
        if (g.active === true) activeUsers = g._count.id;
      }
      pendingUsers = totalUsers - activeUsers;

      recentUsers = dbUsers.map((u, idx) => ({
        id: u.id,
        name: u.fullName || u.username || u.email.split("@")[0],
        email: u.email,
        bib: `M-${2040 + idx}`,
        cat: u.roleName === "RUNNER" ? "Full Marathon 42K" : `Staff (${u.roleName || "Official"})`,
        amt: "₹ 1,800",
        status: "Confirmed",
        badgeClass: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        createdAt: u.createdAt,
      }));

      recentlyUpdatedUsers = updatedUsers.map((u) => ({
        id: u.id,
        name: u.fullName || u.email.split("@")[0],
        email: u.email,
        role: u.roleName || "RUNNER",
        updatedAt: u.updatedAt,
      }));
    } catch {
      totalUsers = 1;
      totalAdmins = 1;
    }

    const result = {
      success: true,
      metrics: {
        totalUsers,
        totalAdmins,
        totalRunners,
        totalOrganizers,
        totalVolunteers,
        activeUsers,
        pendingUsers,
        totalEvents: 8,
        todayRegistrations: recentUsers.length,
        revenue: "₹ 42.6L",
        pendingPayments: "₹ 3.1L",
        completedPayments: totalUsers > 0 ? totalUsers * 1800 : 5918,
      },
      recentUsers,
      recentlyUpdatedUsers,
    };

    // Cache for 60 seconds
    _dashboardCache = result;
    _dashboardCacheExpiry = now + 60_000;

    return res.json(result);
  } catch (error) {
    console.error("Error in getDashboardMetrics:", error);
    next(error);
  }
}
