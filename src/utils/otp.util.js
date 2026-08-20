export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit numeric OTP
}

export function getOTPExpiry(minutes = 10) {
  return new Date(Date.now() + minutes * 60 * 1000);
}
