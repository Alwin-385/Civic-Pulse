"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.verifyEmailOtp = exports.me = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../config/prisma"));
const otp_1 = require("../utils/otp");
const email_1 = require("../utils/email");
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const existingUser = await prisma_1.default.user.findUnique({
            where: { email },
        });
        const otpCode = (0, otp_1.generateOtpCode)();
        const otpCodeHash = (0, otp_1.hashOtpCode)(otpCode);
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        if (existingUser) {
            // If user is already verified, block registration.
            if (existingUser.emailVerifiedAt) {
                return res.status(409).json({ message: "Account already exists" });
            }
            await prisma_1.default.user.update({
                where: { email },
                data: {
                    password: hashedPassword,
                    otpCodeHash,
                    otpExpiresAt,
                    emailVerifiedAt: null,
                },
            });
            await (0, email_1.sendEmail)({
                to: email,
                subject: "Civic Connect OTP Verification",
                text: `Your OTP code is: ${otpCode}\n\nThis code expires in 10 minutes.`,
            });
            return res.status(200).json({
                message: "OTP sent. Please verify your email to login.",
                verificationRequired: true,
                email,
            });
        }
        const user = await prisma_1.default.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                emailVerifiedAt: null,
                otpCodeHash,
                otpExpiresAt,
            },
        });
        await (0, email_1.sendEmail)({
            to: email,
            subject: "Civic Connect OTP Verification",
            text: `Your OTP code is: ${otpCode}\n\nThis code expires in 10 minutes.`,
        });
        return res.status(201).json({
            message: "User registered successfully. OTP sent for verification.",
            verificationRequired: true,
            email: user.email,
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Registration failed",
            error,
        });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }
        const user = await prisma_1.default.user.findUnique({
            where: { email },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        if (!user.emailVerifiedAt) {
            return res.status(403).json({
                message: "Email not verified. Please verify OTP before login.",
                verificationRequired: true,
                email: user.email,
            });
        }
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            role: user.role,
        }, process.env.JWT_SECRET, { expiresIn: "7d" });
        res.cookie("token", token, {
            httpOnly: true,
            sameSite: "lax",
            secure: false,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Login failed",
            error,
        });
    }
};
exports.login = login;
const me = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const user = await prisma_1.default.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        return res.status(200).json({ user });
    }
    catch (error) {
        return res.status(500).json({ message: "Failed to fetch profile", error });
    }
};
exports.me = me;
const verifyEmailOtp = async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            return res.status(400).json({ message: "Email and OTP code are required" });
        }
        const user = await prisma_1.default.user.findUnique({ where: { email } });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        if (user.emailVerifiedAt) {
            return res.status(200).json({ message: "Email already verified" });
        }
        if (!user.otpExpiresAt || !user.otpCodeHash) {
            return res.status(400).json({ message: "OTP not found. Please request again." });
        }
        if (user.otpExpiresAt.getTime() < Date.now()) {
            return res.status(400).json({ message: "OTP expired. Please request again." });
        }
        const providedHash = (0, otp_1.hashOtpCode)(code);
        if (providedHash !== user.otpCodeHash) {
            return res.status(401).json({ message: "Invalid OTP code" });
        }
        await prisma_1.default.user.update({
            where: { email },
            data: {
                emailVerifiedAt: new Date(),
                otpCodeHash: null,
                otpExpiresAt: null,
            },
        });
        return res.status(200).json({ message: "OTP verified successfully" });
    }
    catch (error) {
        return res.status(500).json({ message: "OTP verification failed", error });
    }
};
exports.verifyEmailOtp = verifyEmailOtp;
const logout = async (_req, res) => {
    res.clearCookie("token");
    return res.status(200).json({ message: "Logged out" });
};
exports.logout = logout;
