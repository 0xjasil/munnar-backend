import nodemailer from "nodemailer";

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465 || process.env.SMTP_SECURE === "true",
    auth: {
      user,
      pass,
    },
    // Force IPv4 connection to prevent IPv6 socket ENETUNREACH
    family: 4,
    connectionTimeout: 10000,
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Send Password Reset OTP Email to user
 */
export async function sendResetOTPEmail(toEmail, otpCode) {
  const transporter = createTransporter();
  const fromName = process.env.SMTP_FROM || '"Munnar Marathon Security" <no-reply@munnarmarathon.com>';

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 40px 20px; color: #1e293b;">
      <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(135deg, #064e3b 0%, #047857 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700; tracking-tight: -0.5px;">Munnar Marathon 2027</h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #a7f3d0; text-transform: uppercase; letter-spacing: 2px;">Password Recovery Code</p>
        </div>
        <div style="padding: 32px 28px;">
          <h2 style="margin-top: 0; font-size: 18px; color: #0f172a;">Password Reset Verification</h2>
          <p style="font-size: 14px; line-height: 1.6; color: #475569;">
            We received a request to reset the password for your Munnar Marathon account (<strong>${toEmail}</strong>).
          </p>
          <div style="margin: 28px 0; padding: 20px; background: #f0fdf4; border: 1px dashed #059669; border-radius: 12px; text-align: center;">
            <span style="display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #047857; margin-bottom: 6px; font-weight: 700;">Your 6-Digit One-Time Passcode</span>
            <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #064e3b;">${otpCode}</span>
          </div>
          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
            ⏰ This verification code is valid for <strong>15 minutes</strong>. If you did not request a password reset, please ignore this email or contact support if you have concerns.
          </p>
        </div>
        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
          © 2027 Munnar Marathon. Western Ghats, Kerala, India.
        </div>
      </div>
    </div>
  `;

  if (!transporter) {
    console.log(`\n======================================================`);
    console.log(`📧 [SMTP SIMULATOR] Password Reset Email to ${toEmail}`);
    console.log(`🔑 OTP Code: ${otpCode}`);
    console.log(`⏰ Expiry: 15 minutes`);
    console.log(`💡 (Configure SMTP_HOST, SMTP_USER, SMTP_PASS in .env for real email delivery)`);
    console.log(`======================================================\n`);
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: fromName,
      to: toEmail,
      subject: `🔑 ${otpCode} is your Munnar Marathon Password Reset Code`,
      html: htmlContent,
    });
    console.log(`✅ [SMTP] Password Reset OTP sent to ${toEmail} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ [SMTP ERROR] Failed to send email to ${toEmail}:`, error.message);
    console.log(`🔑 [DEV OTP FALLBACK] Code for ${toEmail} is: ${otpCode}`);
    return { success: false, error: error.message };
  }
}
