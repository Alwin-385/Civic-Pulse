import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/authMiddleware";
import { generateOtpCode, hashOtpCode } from "../utils/otp";
import { sendEmail } from "../utils/email";

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    const hashedPassword = await bcrypt.hash(password, 10);
    const otpCode = generateOtpCode();
    const otpCodeHash = hashOtpCode(otpCode);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const emailBody = `Your verification code is: ${otpCode}\n\nThis code expires in 10 minutes.`;

    if (existingUser) {
      if (existingUser.emailVerifiedAt) {
        return res.status(409).json({ message: "Account already exists" });
      }

      await prisma.user.update({
        where: { email },
        data: {
          name,
          password: hashedPassword,
          role,
          otpCodeHash,
          otpExpiresAt,
        },
      });

      await sendEmail({
        to: email,
        subject: "Verify your Civic Pulse account",
        text: emailBody,
      });

      const payload: Record<string, unknown> = {
        message: "Check your email for a verification code.",
        verificationRequired: true,
        email,
      };
      if (process.env.NODE_ENV !== "production") {
        payload.devOtp = otpCode;
      }
      return res.status(200).json(payload);
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        otpCodeHash,
        otpExpiresAt,
      },
    });

    await sendEmail({
      to: email,
      subject: "Verify your Civic Pulse account",
      text: emailBody,
    });

    const payload: Record<string, unknown> = {
      message: "Account created. Check your email for a verification code.",
      verificationRequired: true,
      email: user.email,
    };
    if (process.env.NODE_ENV !== "production") {
      payload.devOtp = otpCode;
    }
    return res.status(201).json(payload);
  } catch (error) {
    return res.status(500).json({
      message: "Registration failed",
      error,
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.emailVerifiedAt) {
      return res.status(403).json({
        message: "Email not verified. Enter the code we sent you, or request a new one.",
        verificationRequired: true,
        email: user.email,
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
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
  } catch (error) {
    return res.status(500).json({
      message: "Login failed",
      error,
    });
  }
};

export const me = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const users = await prisma.$queryRaw<any[]>`SELECT * FROM "User" WHERE id = ${req.user.id}`;
    const user = users[0];

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.status(200).json({ user });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch profile", error });
  }
};

export const updateMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { name, phone, address, bio } = req.body;

    await prisma.$executeRaw`
      UPDATE "User" 
      SET name = ${name}, phone = ${phone}, address = ${address}, bio = ${bio}
      WHERE id = ${req.user.id}
    `;

    const users = await prisma.$queryRaw<any[]>`SELECT * FROM "User" WHERE id = ${req.user.id}`;
    
    return res.status(200).json({ message: "Profile updated", user: users[0] });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update profile", error });
  }
};

export const verifyEmailOtp = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body as { email: string; code: string };

    if (!email || !code) {
      return res.status(400).json({ message: "Email and OTP code are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.emailVerifiedAt) {
      return res.status(200).json({ message: "Email already verified" });
    }

    if (!user.otpExpiresAt || !user.otpCodeHash) {
      return res.status(400).json({ message: "OTP not found. Please request again." });
    }

    if (user.otpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP expired. Please request again." });
    }

    const providedHash = hashOtpCode(code);
    if (providedHash !== user.otpCodeHash) {
      return res.status(401).json({ message: "Invalid OTP code" });
    }

    await prisma.user.update({
      where: { email },
      data: {
        emailVerifiedAt: new Date(),
        otpCodeHash: null,
        otpExpiresAt: null,
      },
    });

    return res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    return res.status(500).json({ message: "OTP verification failed", error });
  }
};

export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.emailVerifiedAt) return res.status(400).json({ message: "Already verified." });

    const otpCode = generateOtpCode();
    await prisma.user.update({
      where: { email },
      data: {
        otpCodeHash: hashOtpCode(otpCode),
        otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await sendEmail({
      to: email,
      subject: "Civic Connect OTP Resend",
      text: `Your new OTP code is: ${otpCode}\n\nThis code expires in 10 minutes.`,
    });

    const payload: Record<string, unknown> = { message: "OTP sent successfully." };
    if (process.env.NODE_ENV !== "production") {
      payload.devOtp = otpCode;
    }
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({ message: "Failed to resend OTP", error });
  }
};

export const logout = async (req: Request, res: Response) => {
  const isProd = process.env.RENDER || process.env.NODE_ENV === "production";
  res.clearCookie("token", {
    httpOnly: true,
    path: "/",
    sameSite: isProd ? "none" : "lax",
    secure: !!isProd,
  });
  return res.status(200).json({ message: "Logged out" });
};

const FORGOT_PASSWORD_RESPONSE = {
  message:
    "If an account exists for that email, you will receive a reset code shortly.",
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email?.trim()) {
      return res.status(400).json({ message: "Email is required" });
    }

    const normalized = email.trim();
    const user = await prisma.user.findUnique({ where: { email: normalized } });

    if (!user) {
      return res.status(200).json(FORGOT_PASSWORD_RESPONSE);
    }

    const otpCode = generateOtpCode();
    await prisma.user.update({
      where: { email: normalized },
      data: {
        passwordResetOtpHash: hashOtpCode(otpCode),
        passwordResetOtpExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await sendEmail({
      to: normalized,
      subject: "Reset your Civic Pulse password",
      text: `Your password reset code is: ${otpCode}\n\nThis code expires in 15 minutes.\n\nIf you did not request this, you can ignore this email.`,
    });

    const payload: Record<string, unknown> = { ...FORGOT_PASSWORD_RESPONSE };
    if (process.env.NODE_ENV !== "production") {
      payload.devOtp = otpCode;
    }
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({ message: "Failed to process request", error });
  }
};

export const resetPasswordWithCode = async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body as {
      email?: string;
      code?: string;
      newPassword?: string;
    };

    if (!email?.trim() || !code || !newPassword) {
      return res.status(400).json({
        message: "Email, reset code, and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const normalized = email.trim();
    const user = await prisma.user.findUnique({ where: { email: normalized } });

    if (!user?.passwordResetOtpHash || !user.passwordResetOtpExpiresAt) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    if (user.passwordResetOtpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: "Reset code expired. Request a new one." });
    }

    if (hashOtpCode(String(code).replace(/\D/g, "").slice(0, 6)) !== user.passwordResetOtpHash) {
      return res.status(401).json({ message: "Invalid reset code" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email: normalized },
      data: {
        password: hashedPassword,
        passwordResetOtpHash: null,
        passwordResetOtpExpiresAt: null,
      },
    });

    return res.status(200).json({ message: "Password updated. You can sign in now." });
  } catch (error) {
    return res.status(500).json({ message: "Password reset failed", error });
  }
};