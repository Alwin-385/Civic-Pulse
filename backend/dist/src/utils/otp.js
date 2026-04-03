"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOtpCode = generateOtpCode;
exports.hashOtpCode = hashOtpCode;
const crypto_1 = __importDefault(require("crypto"));
function generateOtpCode() {
    // 6-digit OTP
    const n = Math.floor(100000 + Math.random() * 900000);
    return String(n);
}
function hashOtpCode(code) {
    return crypto_1.default.createHash("sha256").update(code).digest("hex");
}
