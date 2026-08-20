import bcrypt from "bcryptjs";
import { UserRepository } from "./user.repository.js";

export class UserService {
  static async getProfile(userId) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw { statusCode: 404, message: "User not found." };
    }
    const { passwordHash, otpCode, otpExpiresAt, ...userWithoutSecrets } = user;
    return {
      ...userWithoutSecrets,
      role: user.roleName || user.role?.name || "RUNNER",
    };
  }

  static async updateProfile(userId, data) {
    const allowedFields = [
      "fullName", "mobile", "dob", "gender", "bloodGroup", "nationality",
      "address", "emergencyName", "emergencyPhone", "medicalConditions", "tshirtSize", "avatarUrl"
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        if (field === "dob") {
          updateData[field] = data[field] ? new Date(data[field]) : null;
        } else {
          updateData[field] = data[field] === "" ? null : data[field];
        }
      }
    }

    const updated = await UserRepository.updateProfile(userId, updateData);
    const { passwordHash, otpCode, otpExpiresAt, ...userWithoutSecrets } = updated;

    return {
      ...userWithoutSecrets,
      role: updated.roleName || updated.role?.name || "RUNNER",
    };
  }

  static async changePassword(userId, { currentPassword, newPassword }) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw { statusCode: 404, message: "User not found." };
    }

    if (!user.passwordHash) {
      throw { statusCode: 400, message: "This account uses social sign-in. Password cannot be changed." };
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw { statusCode: 400, message: "Current password is incorrect." };
    }

    if (newPassword.length < 6) {
      throw { statusCode: 400, message: "New password must be at least 6 characters long." };
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await UserRepository.updatePassword(userId, newHash);

    return { success: true, message: "Password updated successfully." };
  }
}
