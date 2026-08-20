import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { AuthRepository } from "./auth.repository.js";
import { generateAccessToken, generateRefreshToken } from "../utils/token.util.js";
import { OtpService, OTP_PURPOSE } from "./otp.service.js";
import { sendSignupOTPEmail, sendResetOTPEmail } from "./email.service.js";

const JWT_SECRET = process.env.JWT_SECRET || "munnar_marathon_super_secret_jwt_key_2027_secure";

const getGoogleClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  return new OAuth2Client(clientId);
};

export class AuthService {
  static async googleLogin({ idToken }) {
    if (!idToken) {
      throw { statusCode: 400, message: "Google ID token credential is required." };
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    let payload;

    try {
      const client = getGoogleClient();
      const ticket = await client.verifyIdToken({
        idToken,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch (err) {
      throw { statusCode: 401, message: `Google authentication failed: ${err.message || "Invalid token"}` };
    }

    if (!payload) {
      throw { statusCode: 401, message: "Failed to verify Google identity token." };
    }

    const googleId = payload.sub;
    const email = payload.email?.toLowerCase();
    const fullName = payload.name || `${payload.given_name || ""} ${payload.family_name || ""}`.trim() || "Google User";
    const avatarUrl = payload.picture || null;

    if (!email) {
      throw { statusCode: 400, message: "Google account does not provide a valid email address." };
    }

    let user = await AuthRepository.findUserByGoogleId(googleId);

    if (!user) {
      user = await AuthRepository.findUserByEmailOrUsername(email);

      if (user) {
        const updateData = { googleId };
        if (!user.avatarUrl && avatarUrl) updateData.avatarUrl = avatarUrl;
        if (!user.emailVerified) updateData.emailVerified = true;
        user = await AuthRepository.updateUser(user.id, updateData);
      } else {
        const userCount = await AuthRepository.countUsers();
        const isFirstUser = userCount === 0;
        const targetRoleName = isFirstUser ? "SUPER_ADMIN" : "RUNNER";
        const targetRole = await AuthRepository.getRoleByName(targetRoleName);

        const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
        let username = baseUsername;
        let count = 1;
        while (await AuthRepository.findUserByEmailOrUsername(username)) {
          username = `${baseUsername}${count++}`;
        }

        user = await AuthRepository.createUser({
          email,
          username,
          fullName,
          roleId: targetRole?.id,
          roleName: targetRoleName,
          emailVerified: true,
          active: true,
          googleId,
          authProvider: "google",
          avatarUrl,
        });
      }
    }

    if (!user.active) {
      throw { statusCode: 403, message: "Your account is deactivated. Please contact support." };
    }

    const effectiveRole = user.roleName || user.role?.name || "RUNNER";

    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      username: user.username,
      role: effectiveRole,
    });

    const refreshToken = generateRefreshToken();
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await AuthRepository.createRefreshToken(user.id, refreshToken, refreshExpiresAt);

    const { passwordHash, otpCode, ...userWithoutSecrets } = user;

    return {
      token: accessToken,
      refreshToken,
      user: {
        ...userWithoutSecrets,
        role: effectiveRole,
      },
    };
  }

  static async register({ email, password, fullName, mobile, username }) {
    const cleanEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw { statusCode: 400, message: "Invalid email format" };
    }

    if (!password || password.length < 6) {
      throw { statusCode: 400, message: "Password must be at least 6 characters long." };
    }

    const cleanUsername = (username || cleanEmail.split("@")[0]).trim().toLowerCase();

    const existingUser = await AuthRepository.findUserByEmailOrUsername(cleanEmail);
    if (existingUser && existingUser.emailVerified) {
      throw { statusCode: 409, message: "An account with this email already exists. Please sign in." };
    }

    const userCount = await AuthRepository.countUsers();
    const isFirstUser = userCount === 0;
    const targetRoleName = isFirstUser ? "SUPER_ADMIN" : "RUNNER";
    const targetRole = await AuthRepository.getRoleByName(targetRoleName);
    const passwordHash = await bcrypt.hash(password, 10);

    let user;

    if (existingUser && !existingUser.emailVerified) {
      // Update unverified user's credentials and info
      user = await AuthRepository.updateUser(existingUser.id, {
        passwordHash,
        fullName: fullName.trim(),
        mobile: mobile ? mobile.trim() : null,
        username: cleanUsername,
      });
    } else {
      user = await AuthRepository.createUser({
        email: cleanEmail,
        username: cleanUsername,
        passwordHash,
        fullName: fullName.trim(),
        mobile: mobile ? mobile.trim() : null,
        roleId: targetRole?.id,
        roleName: targetRoleName,
        emailVerified: isFirstUser, // Auto-verify first user as Super Admin
        active: true,
      });
    }

    // 1st User Auto-Promotion to Super Admin
    if (isFirstUser) {
      const accessToken = generateAccessToken({
        id: user.id,
        email: user.email,
        username: user.username,
        role: "SUPER_ADMIN",
      });

      const refreshToken = generateRefreshToken();
      const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await AuthRepository.createRefreshToken(user.id, refreshToken, refreshExpiresAt);

      return {
        isFirstUserAdmin: true,
        requiresVerification: false,
        token: accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          mobile: user.mobile,
          role: "SUPER_ADMIN",
          emailVerified: true,
        },
      };
    }

    // Generate secure 6-digit OTP
    const { plainOTP } = await OtpService.createOTP({
      email: cleanEmail,
      userId: user.id,
      purpose: OTP_PURPOSE.SIGNUP,
    });

    // Send verification email
    sendSignupOTPEmail(cleanEmail, plainOTP, user.fullName).catch((err) => {
      console.error(`❌ [EMAIL] Signup OTP background dispatch failed:`, err.message);
    });

    return {
      requiresVerification: true,
      email: cleanEmail,
      message: "Verification code sent. Please check your email to activate your account.",
    };
  }

  static async verifyEmailOTP({ email, otpCode }) {
    const cleanEmail = email.trim().toLowerCase();

    // Verify OTP code
    await OtpService.verifyOTP({
      email: cleanEmail,
      otpCode,
      purpose: OTP_PURPOSE.SIGNUP,
    });

    const user = await AuthRepository.findUserByEmailOrUsername(cleanEmail);
    if (!user) {
      throw { statusCode: 404, message: "User not found." };
    }

    // Mark user as verified & active
    const updatedUser = await AuthRepository.updateUser(user.id, {
      emailVerified: true,
      active: true,
    });

    const effectiveRole = updatedUser.roleName || updatedUser.role?.name || "RUNNER";

    const accessToken = generateAccessToken({
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      role: effectiveRole,
    });

    const refreshToken = generateRefreshToken();
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await AuthRepository.createRefreshToken(updatedUser.id, refreshToken, refreshExpiresAt);

    return {
      token: accessToken,
      refreshToken,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        fullName: updatedUser.fullName,
        mobile: updatedUser.mobile,
        role: effectiveRole,
        emailVerified: true,
      },
    };
  }

  static async resendOTP({ email, purpose = OTP_PURPOSE.SIGNUP }) {
    const cleanEmail = email.trim().toLowerCase();
    const user = await AuthRepository.findUserByEmailOrUsername(cleanEmail);

    if (purpose === OTP_PURPOSE.SIGNUP && user?.emailVerified) {
      throw { statusCode: 400, message: "Your email is already verified. Please sign in." };
    }

    const { plainOTP } = await OtpService.resendOTP({
      email: cleanEmail,
      purpose,
      userId: user?.id || null,
    });

    if (purpose === OTP_PURPOSE.SIGNUP) {
      sendSignupOTPEmail(cleanEmail, plainOTP, user?.fullName || "Runner").catch((err) => {
        console.error(`❌ [EMAIL] Resend Signup OTP failed:`, err.message);
      });
    } else {
      sendResetOTPEmail(cleanEmail, plainOTP).catch((err) => {
        console.error(`❌ [EMAIL] Resend Reset OTP failed:`, err.message);
      });
    }

    return {
      success: true,
      message: "A fresh 6-digit verification code has been sent to your email.",
    };
  }

  static async login({ identifier, password }) {
    const user = await AuthRepository.findUserByEmailOrUsername(identifier);
    if (!user) {
      throw { statusCode: 401, message: "Invalid email/username or password." };
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw { statusCode: 401, message: "Invalid email/username or password." };
    }

    if (!user.active) {
      throw { statusCode: 403, message: "Your account is deactivated. Please contact support." };
    }

    // If user is not email-verified, trigger fresh OTP and redirect to OTP screen
    if (!user.emailVerified) {
      const { plainOTP } = await OtpService.createOTP({
        email: user.email,
        userId: user.id,
        purpose: OTP_PURPOSE.SIGNUP,
      });

      sendSignupOTPEmail(user.email, plainOTP, user.fullName).catch((err) => {
        console.error(`❌ [EMAIL] Login Unverified OTP dispatch failed:`, err.message);
      });

      return {
        requiresVerification: true,
        email: user.email,
        message: "Your email address is not yet verified. A new 6-digit code has been sent to your email.",
      };
    }

    const effectiveRole = user.roleName || user.role?.name || "RUNNER";

    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      username: user.username,
      role: effectiveRole,
    });

    const refreshToken = generateRefreshToken();
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await AuthRepository.createRefreshToken(user.id, refreshToken, refreshExpiresAt);

    const { passwordHash, otpCode, ...userWithoutSecrets } = user;

    return {
      token: accessToken,
      refreshToken,
      user: {
        ...userWithoutSecrets,
        role: effectiveRole,
      },
    };
  }

  static async refresh(token) {
    if (!token) {
      throw { statusCode: 400, message: "Refresh token is required." };
    }

    const storedToken = await AuthRepository.findRefreshToken(token);
    if (!storedToken || storedToken.revoked || new Date() > new Date(storedToken.expiresAt)) {
      throw { statusCode: 401, message: "Invalid or expired refresh token." };
    }

    const user = storedToken.user;
    const effectiveRole = user.roleName || user.role?.name || "RUNNER";

    const newAccessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      username: user.username,
      role: effectiveRole,
    });

    return {
      token: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        role: effectiveRole,
      },
    };
  }

  static async logout(refreshToken) {
    if (refreshToken) {
      try {
        await AuthRepository.revokeRefreshToken(refreshToken);
      } catch {}
    }
    return { message: "Logged out successfully." };
  }

  static async forgotPassword({ email }) {
    const cleanEmail = email.trim().toLowerCase();
    const user = await AuthRepository.findUserByEmailOrUsername(cleanEmail);

    if (user) {
      const { plainOTP } = await OtpService.createOTP({
        email: cleanEmail,
        userId: user.id,
        purpose: OTP_PURPOSE.PASSWORD_RESET,
      });

      sendResetOTPEmail(user.email, plainOTP).catch((err) => {
        console.error(`❌ [EMAIL] Background send failed for ${cleanEmail}:`, err.message);
      });
    }

    return {
      success: true,
      message: "If an account exists with that email, a 6-digit password reset code has been sent.",
    };
  }

  static async verifyResetOTP({ email, otpCode }) {
    const cleanEmail = email.trim().toLowerCase();

    await OtpService.verifyOTP({
      email: cleanEmail,
      otpCode,
      purpose: OTP_PURPOSE.PASSWORD_RESET,
    });

    // Create a temporary signed reset token (10 mins)
    const resetToken = jwt.sign(
      { email: cleanEmail, purpose: "PASSWORD_RESET_AUTHORIZED" },
      JWT_SECRET,
      { expiresIn: "10m" }
    );

    return {
      success: true,
      message: "OTP verified successfully. You can now reset your password.",
      resetToken,
    };
  }

  static async resetPassword({ email, otpCode, resetToken, newPassword }) {
    const cleanEmail = email.trim().toLowerCase();

    if (!newPassword || newPassword.length < 6) {
      throw { statusCode: 400, message: "New password must be at least 6 characters long." };
    }

    // Verify either reset token OR otpCode
    if (resetToken) {
      try {
        const decoded = jwt.verify(resetToken, JWT_SECRET);
        if (decoded.email !== cleanEmail || decoded.purpose !== "PASSWORD_RESET_AUTHORIZED") {
          throw new Error();
        }
      } catch {
        throw { statusCode: 400, message: "Reset authorization expired. Please request a new code." };
      }
    } else if (otpCode) {
      await OtpService.verifyOTP({
        email: cleanEmail,
        otpCode,
        purpose: OTP_PURPOSE.PASSWORD_RESET,
      });
    } else {
      throw { statusCode: 400, message: "Verification code or reset token is required." };
    }

    const user = await AuthRepository.findUserByEmailOrUsername(cleanEmail);
    if (!user) {
      throw { statusCode: 400, message: "Invalid reset request." };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await AuthRepository.updateUser(user.id, { passwordHash });

    // Invalidate all active user sessions
    await AuthRepository.revokeAllUserTokens(user.id);

    // Clean up verified reset OTPs
    await prisma.otpVerification.deleteMany({
      where: { email: cleanEmail, purpose: OTP_PURPOSE.PASSWORD_RESET },
    }).catch(() => {});

    return {
      success: true,
      message: "Password reset successfully. Please sign in with your new credentials.",
    };
  }

  static async changePassword({ userId, currentPassword, newPassword }) {
    const user = await AuthRepository.findUserById(userId);
    if (!user) {
      throw { statusCode: 404, message: "User account not found." };
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw { statusCode: 400, message: "Incorrect current password." };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await AuthRepository.updateUser(user.id, { passwordHash });

    return { success: true, message: "Password updated successfully." };
  }
}
