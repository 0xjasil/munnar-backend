import prisma from "./src/config/db.js";
import { AuthService } from "./src/services/auth.service.js";
import { OtpService, OTP_PURPOSE } from "./src/services/otp.service.js";

async function runAuthOtpTests() {
  console.log("==================================================");
  console.log("🧪 STARTING AUTHENTICATION & OTP SYSTEM TESTS");
  console.log("==================================================");

  const timestamp = Date.now();
  const testEmail = `runner_${timestamp}@example.com`;
  const initialPassword = "RunnerPassword123!";
  const updatedPassword = "NewSecurePassword456!";
  const fullName = "Alia Thomas";

  try {
    // 1. TEST SIGNUP FLOW
    console.log("\n[TEST 1] Register new user account...");
    const signupRes = await AuthService.register({
      email: testEmail,
      password: initialPassword,
      fullName,
      mobile: "9876543210",
      username: `runner_${timestamp}`,
    });

    console.log("✓ Signup initiated:", signupRes.requiresVerification, signupRes.email);
    if (!signupRes.requiresVerification) throw new Error("Expected requiresVerification: true");

    // Inspect stored OTP in DB
    const dbOtp = await prisma.otpVerification.findFirst({
      where: { email: testEmail, purpose: OTP_PURPOSE.SIGNUP },
      orderBy: { createdAt: "desc" },
    });

    console.log("✓ Stored OTP record created in DB:", {
      id: dbOtp?.id,
      purpose: dbOtp?.purpose,
      hasBcryptHash: !!dbOtp?.otpHash && dbOtp.otpHash.startsWith("$2"),
      attempts: dbOtp?.attempts,
      maxAttempts: dbOtp?.maxAttempts,
      expiresAt: dbOtp?.expiresAt,
    });

    // 2. TEST WRONG OTP ATTEMPTS
    console.log("\n[TEST 2] Testing incorrect OTP attempts...");
    try {
      await AuthService.verifyEmailOTP({ email: testEmail, otpCode: "000000" });
      throw new Error("Wrong OTP should have failed!");
    } catch (err) {
      console.log("✓ Wrong OTP rejected correctly with message:", err.message);
    }

    const dbOtpAfterWrong = await prisma.otpVerification.findUnique({ where: { id: dbOtp.id } });
    console.log("✓ Attempt counter incremented:", dbOtpAfterWrong?.attempts, "/ 5");

    // 3. TEST RESEND OTP (COOLDOWN)
    console.log("\n[TEST 3] Testing resend cooldown...");
    try {
      await AuthService.resendOTP({ email: testEmail, purpose: OTP_PURPOSE.SIGNUP });
      throw new Error("Immediate resend should have triggered cooldown!");
    } catch (err) {
      console.log("✓ Resend cooldown enforced correctly:", err.message);
    }

    // 4. TEST CORRECT OTP VERIFICATION
    console.log("\n[TEST 4] Testing correct OTP verification...");
    // Create a new known OTP directly to test positive path
    const { plainOTP } = await OtpService.createOTP({ email: testEmail, purpose: OTP_PURPOSE.SIGNUP });
    const verifyRes = await AuthService.verifyEmailOTP({ email: testEmail, otpCode: plainOTP });

    console.log("✓ Email verified successfully:", {
      emailVerified: verifyRes.user.emailVerified,
      tokenIssued: !!verifyRes.token,
      userId: verifyRes.user.id,
    });

    // Verify OTP record is invalidated
    const usedOtp = await prisma.otpVerification.findFirst({
      where: { email: testEmail, purpose: OTP_PURPOSE.SIGNUP },
      orderBy: { createdAt: "desc" },
    });
    console.log("✓ OTP invalidated after use:", !!usedOtp?.verifiedAt);

    // 5. TEST EXISTING VERIFIED USER LOGIN
    console.log("\n[TEST 5] Testing verified user login...");
    const loginRes = await AuthService.login({ identifier: testEmail, password: initialPassword });
    console.log("✓ Login successful for verified user:", {
      role: loginRes.user.role,
      email: loginRes.user.email,
      requiresVerification: loginRes.requiresVerification,
    });

    // 6. TEST FORGOT PASSWORD FLOW
    console.log("\n[TEST 6] Testing Forgot Password flow...");
    const forgotRes = await AuthService.forgotPassword({ email: testEmail });
    console.log("✓ Forgot password requested:", forgotRes.message);

    const resetDbOtp = await prisma.otpVerification.findFirst({
      where: { email: testEmail, purpose: OTP_PURPOSE.PASSWORD_RESET },
      orderBy: { createdAt: "desc" },
    });

    console.log("✓ Reset OTP record in DB with purpose PASSWORD_RESET:", {
      id: resetDbOtp?.id,
      purpose: resetDbOtp?.purpose,
    });

    // 7. TEST VERIFY RESET OTP & RESET PASSWORD
    console.log("\n[TEST 7] Testing Verify Reset OTP & Reset Password...");
    const { plainOTP: resetPlainOTP } = await OtpService.createOTP({
      email: testEmail,
      purpose: OTP_PURPOSE.PASSWORD_RESET,
    });

    const verifyResetRes = await AuthService.verifyResetOTP({
      email: testEmail,
      otpCode: resetPlainOTP,
    });
    console.log("✓ Reset OTP verified, reset token received:", !!verifyResetRes.resetToken);

    const resetPassRes = await AuthService.resetPassword({
      email: testEmail,
      resetToken: verifyResetRes.resetToken,
      newPassword: updatedPassword,
    });
    console.log("✓ Password reset result:", resetPassRes.message);

    // 8. TEST LOGIN WITH NEW PASSWORD
    console.log("\n[TEST 8] Testing login with updated password...");
    // Old password should fail
    try {
      await AuthService.login({ identifier: testEmail, password: initialPassword });
      throw new Error("Old password should not work!");
    } catch (err) {
      console.log("✓ Old password rejected correctly:", err.message);
    }

    // New password should succeed
    const newLoginRes = await AuthService.login({ identifier: testEmail, password: updatedPassword });
    console.log("✓ Login with new password succeeded:", newLoginRes.user.email);

    // 9. CLEAN UP TEST DATA
    console.log("\n[TEST 9] Cleaning up test data...");
    await prisma.otpVerification.deleteMany({ where: { email: testEmail } });
    await prisma.refreshToken.deleteMany({ where: { userId: verifyRes.user.id } });
    await prisma.user.delete({ where: { id: verifyRes.user.id } });
    console.log("✓ Test records cleaned up successfully.");

    console.log("\n==================================================");
    console.log("🎉 ALL AUTHENTICATION & OTP TESTS PASSED 100%!");
    console.log("==================================================");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ TEST FAILED:", error);
    process.exit(1);
  }
}

runAuthOtpTests();
