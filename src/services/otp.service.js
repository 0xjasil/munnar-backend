import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "../config/db.js";

export const OTP_PURPOSE = {
  SIGNUP: "SIGNUP",
  PASSWORD_RESET: "PASSWORD_RESET",
};

export const OTP_CONFIG = {
  EXPIRY_MINUTES: 5,
  MAX_ATTEMPTS: 5,
  RESEND_COOLDOWN_SECONDS: 60,
};

export class OtpService {
  /**
   * Generates a secure 6-digit numeric code
   */
  static generateNumericOTP() {
    return crypto.randomInt(100000, 1000000).toString();
  }

  /**
   * Create and store a new hashed OTP for a given email and purpose
   * Automatically invalidates previous active OTPs for the same (email, purpose)
   */
  static async createOTP({ email, userId = null, purpose = OTP_PURPOSE.SIGNUP }) {
    const cleanEmail = email.trim().toLowerCase();

    // Invalidate/delete existing unverified OTPs for this email & purpose
    await prisma.otpVerification.deleteMany({
      where: {
        email: cleanEmail,
        purpose,
        verifiedAt: null,
      },
    });

    const plainOTP = this.generateNumericOTP();
    const otpHash = await bcrypt.hash(plainOTP, 10);
    const expiresAt = new Date(Date.now() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000);

    const record = await prisma.otpVerification.create({
      data: {
        email: cleanEmail,
        userId,
        otpHash,
        purpose,
        expiresAt,
        attempts: 0,
        maxAttempts: OTP_CONFIG.MAX_ATTEMPTS,
      },
    });

    return {
      otpId: record.id,
      plainOTP, // Returned ONLY to be sent via email (never to client response)
      expiresAt,
    };
  }

  /**
   * Verify an entered OTP against the stored hash
   */
  static async verifyOTP({ email, otpCode, purpose }) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = String(otpCode || "").trim();

    if (!cleanCode || cleanCode.length !== 6) {
      throw { statusCode: 400, message: "Please enter a valid 6-digit OTP code." };
    }

    // Find the latest unverified OTP for this email and purpose
    const record = await prisma.otpVerification.findFirst({
      where: {
        email: cleanEmail,
        purpose,
        verifiedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      throw { statusCode: 400, message: "No active verification code found. Please request a new code." };
    }

    // Check if expired
    if (new Date() > new Date(record.expiresAt)) {
      await prisma.otpVerification.delete({ where: { id: record.id } }).catch(() => {});
      throw { statusCode: 400, message: "Verification code has expired. Please request a new one." };
    }

    // Check attempt limit
    if (record.attempts >= record.maxAttempts) {
      await prisma.otpVerification.delete({ where: { id: record.id } }).catch(() => {});
      throw {
        statusCode: 429,
        message: "Maximum verification attempts exceeded. Please request a new code.",
      };
    }

    // Compare with bcrypt hash
    const isMatch = await bcrypt.compare(cleanCode, record.otpHash);

    if (!isMatch) {
      const updatedAttempts = record.attempts + 1;
      await prisma.otpVerification.update({
        where: { id: record.id },
        data: { attempts: updatedAttempts },
      });

      const remainingAttempts = record.maxAttempts - updatedAttempts;
      if (remainingAttempts <= 0) {
        await prisma.otpVerification.delete({ where: { id: record.id } }).catch(() => {});
        throw {
          statusCode: 400,
          message: "Invalid code. Maximum attempts exceeded. Please request a new code.",
        };
      }

      throw {
        statusCode: 400,
        message: `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining.`,
      };
    }

    // Success: mark as verified and invalidate so it cannot be reused
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { verifiedAt: new Date() },
    });

    return {
      success: true,
      email: cleanEmail,
      userId: record.userId,
    };
  }

  /**
   * Resend OTP with cooldown check
   */
  static async resendOTP({ email, purpose = OTP_PURPOSE.SIGNUP, userId = null }) {
    const cleanEmail = email.trim().toLowerCase();

    // Check for recent OTP generation to enforce cooldown
    const latest = await prisma.otpVerification.findFirst({
      where: {
        email: cleanEmail,
        purpose,
      },
      orderBy: { createdAt: "desc" },
    });

    if (latest) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(latest.createdAt).getTime()) / 1000);
      if (elapsedSeconds < OTP_CONFIG.RESEND_COOLDOWN_SECONDS) {
        const remainingCooldown = OTP_CONFIG.RESEND_COOLDOWN_SECONDS - elapsedSeconds;
        throw {
          statusCode: 429,
          message: `Please wait ${remainingCooldown}s before requesting another verification code.`,
          retryAfter: remainingCooldown,
        };
      }
    }

    return this.createOTP({ email: cleanEmail, userId, purpose });
  }
}
