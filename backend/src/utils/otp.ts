import crypto from "crypto";

export function generateOtpCode() {
  // 6-digit OTP
  const n = Math.floor(100000 + Math.random() * 900000);
  return String(n);
}

export function hashOtpCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

