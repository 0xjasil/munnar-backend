import { AuthService } from "../services/auth.service.js";

export class AuthController {
  static async googleLogin(req, res, next) {
    try {
      const { idToken } = req.body;
      if (!idToken) {
        return res.status(400).json({ success: false, message: "Google ID token is required." });
      }

      const result = await AuthService.googleLogin({ idToken });

      res.cookie("access_token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        message: "Google sign-in successful",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async register(req, res, next) {
    try {
      const { email, password, fullName, mobile, username } = req.body;
      if (!email || !password || !fullName) {
        return res.status(400).json({ success: false, message: "Email, password, and full name are required." });
      }

      const result = await AuthService.register({ email, password, fullName, mobile, username });

      if (result.token) {
        res.cookie("access_token", result.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.cookie("refreshToken", result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60 * 1000,
        });
      }

      res.status(201).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyEmail(req, res, next) {
    try {
      const { email, otpCode, code } = req.body;
      const finalCode = otpCode || code;

      if (!email || !finalCode) {
        return res.status(400).json({ success: false, message: "Email and 6-digit verification code are required." });
      }

      const result = await AuthService.verifyEmailOTP({ email, otpCode: finalCode });

      res.cookie("access_token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        message: "Email verified successfully! Welcome to Munnar Marathon.",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async resendOTP(req, res, next) {
    try {
      const { email, purpose } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: "Email is required." });
      }

      const result = await AuthService.resendOTP({ email, purpose });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, username, loginId, password } = req.body;
      const identifier = email || username || loginId;

      if (!identifier || !password) {
        return res.status(400).json({ success: false, message: "Email/Username and password are required." });
      }

      const result = await AuthService.login({ identifier, password });

      if (result.requiresVerification) {
        return res.json({
          success: true,
          ...result,
        });
      }

      res.cookie("access_token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json({
        success: true,
        message: "Logged in successfully",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req, res, next) {
    try {
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
      const result = await AuthService.refresh(refreshToken);

      res.cookie("access_token", result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
      await AuthService.logout(refreshToken);
      res.clearCookie("access_token");
      res.clearCookie("refreshToken");
      res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req, res, next) {
    try {
      res.json({
        success: true,
        user: req.user,
      });
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: "Email is required." });
      }

      const result = await AuthService.forgotPassword({ email });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async verifyResetOTP(req, res, next) {
    try {
      const { email, otpCode, code } = req.body;
      const finalCode = otpCode || code;

      if (!email || !finalCode) {
        return res.status(400).json({ success: false, message: "Email and 6-digit OTP code are required." });
      }

      const result = await AuthService.verifyResetOTP({ email, otpCode: finalCode });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req, res, next) {
    try {
      const { email, otpCode, resetToken, newPassword, password } = req.body;
      const finalPassword = newPassword || password;

      if (!email || !finalPassword) {
        return res.status(400).json({ success: false, message: "Email and new password are required." });
      }

      const result = await AuthService.resetPassword({
        email,
        otpCode,
        resetToken,
        newPassword: finalPassword,
      });
      res.json(result);
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

      const result = await AuthService.changePassword({
        userId: req.user.id,
        currentPassword,
        newPassword,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
