import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "munnar_marathon_super_secret_jwt_key_2027_secure";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export function generateAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function generateRefreshToken() {
  return crypto.randomBytes(40).toString("hex");
}

export function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
