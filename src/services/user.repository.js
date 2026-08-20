import prisma from "../config/db.js";

export class UserRepository {
  static async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
  }

  static async updateProfile(id, profileData) {
    return prisma.user.update({
      where: { id },
      data: profileData,
      include: { role: true },
    });
  }

  static async updatePassword(id, passwordHash) {
    return prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }
}
