import prisma from "../config/db.js";

export class AuthRepository {
  static async findUserByEmailOrUsername(identifier) {
    const clean = identifier.trim().toLowerCase();
    return prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: clean, mode: "insensitive" } },
          { username: { equals: clean, mode: "insensitive" } },
        ],
      },
      include: { role: true },
    });
  }

  static async findUserByGoogleId(googleId) {
    if (!googleId) return null;
    return prisma.user.findUnique({
      where: { googleId },
      include: { role: true },
    });
  }

  static async findUserById(id) {
    return prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  }

  static async createUser(userData) {
    return prisma.user.create({
      data: userData,
      include: { role: true },
    });
  }

  static async updateUser(id, updateData) {
    return prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true },
    });
  }

  static async countUsers() {
    return prisma.user.count();
  }

  static async getRoleByName(name) {
    let role = await prisma.role.findUnique({ where: { name } });
    if (!role) {
      const labels = {
        SUPER_ADMIN: "Super Admin",
        ADMIN: "Administrator",
        ORGANIZER: "Race Organizer",
        VOLUNTEER: "Volunteer",
        RUNNER: "Runner",
      };
      role = await prisma.role.create({
        data: {
          name,
          label: labels[name] || name,
          description: `Role ${name}`,
          permissions: name === "SUPER_ADMIN" ? ["all"] : ["basic"],
        },
      });
    }
    return role;
  }

  // Refresh token management
  static async createRefreshToken(userId, token, expiresAt) {
    return prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  static async findRefreshToken(token) {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { include: { role: true } } },
    });
  }

  static async revokeRefreshToken(token) {
    return prisma.refreshToken.update({
      where: { token },
      data: { revoked: true },
    });
  }

  static async revokeAllUserTokens(userId) {
    return prisma.refreshToken.updateMany({
      where: { userId },
      data: { revoked: true },
    });
  }
}
