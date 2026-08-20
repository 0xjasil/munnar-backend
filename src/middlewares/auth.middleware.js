import jwt from "jsonwebtoken";
import prisma from "../config/db.js";

const JWT_SECRET = process.env.JWT_SECRET || "munnar_marathon_super_secret_jwt_key_2027_secure";

export async function authenticateToken(req, res, next) {
  let token = req.cookies?.access_token;
  if (!token) {
    const authHeader = req.headers["authorization"];
    token = authHeader && authHeader.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication token required." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user from DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { role: true },
    });

    if (!user || !user.active) {
      return res.status(401).json({ success: false, message: "Account is inactive or user no longer exists." });
    }

    const { passwordHash, otpCode, ...userWithoutSecrets } = user;
    req.user = {
      ...userWithoutSecrets,
      role: user.roleName || user.role?.name || "RUNNER",
    };

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token.", error: err.message });
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized access" });
    }

    const userRole = req.user.role;
    if (userRole === "SUPER_ADMIN") {
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access requires one of roles: [${allowedRoles.join(", ")}]. Current role: ${userRole}`,
      });
    }

    next();
  };
}
