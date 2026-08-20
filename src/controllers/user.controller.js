import { UserService } from "../services/user.service.js";

export class UserController {
  static async getProfile(req, res, next) {
    try {
      const user = await UserService.getProfile(req.user.id);
      res.json({ success: true, user });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const user = await UserService.updateProfile(req.user.id, req.body);
      res.json({ success: true, message: "Profile updated successfully", user });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: "Current password and new password are required." });
      }

      const result = await UserService.changePassword(req.user.id, { currentPassword, newPassword });
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
}
