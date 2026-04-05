import { Router } from "express";
import jwt from "jsonwebtoken";
import passport from "passport";
import {
  login,
  logout,
  me,
  register,
  verifyEmailOtp,
  updateMe,
  resendOtp,
  forgotPassword,
  resetPasswordWithCode,
} from "../controllers/authController";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/verify-email", verifyEmailOtp);
router.post("/resend-otp", resendOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPasswordWithCode);
router.get("/me", authenticate, me);
router.put("/me", authenticate, updateMe);
router.post("/logout", logout);

router.get("/google", (req, res, next) => {
  const role = req.query.role === "OFFICIAL" ? "OFFICIAL" : "CITIZEN";
  ((req as any).session as any).oauthRole = role;
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })(req, res, next);
});

const isProd = process.env.RENDER || process.env.NODE_ENV === "production";
const FRONTEND_URL =
  process.env.FRONTEND_ORIGIN ||
  (isProd ? "https://civic-pulse-platform.vercel.app" : "http://localhost:3000");

router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", { session: false }, (err: unknown, user: any) => {
    if (err) {
      console.error("Google OAuth callback error:", err);
      return res.redirect(`${FRONTEND_URL}/?oauth_error=1`);
    }
    if (!user) {
      return res.redirect(`${FRONTEND_URL}/`);
    }

    const u = user as any;
    const token = jwt.sign(
      { id: u.id, role: u.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      secure: !!isProd,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(`${FRONTEND_URL}/?token=${token}`);
  })(req, res, next);
});

export default router;