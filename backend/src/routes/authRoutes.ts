import { Router, Request, Response, NextFunction } from "express";
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
import { getCookieOptions, resolveOAuthReturnUrl } from "../config/env";
import { decodeOAuthState, encodeOAuthState, mapOAuthErrorCode } from "../utils/oauthState";

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
  const returnTo = typeof req.query.returnTo === "string" ? req.query.returnTo : undefined;
  const resolvedReturnTo = resolveOAuthReturnUrl(returnTo);
  const state = encodeOAuthState({ returnTo: resolvedReturnTo, role });

  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
    state,
  })(req, res, next);
});

router.get("/google/callback", (req: Request, res: Response, next: NextFunction) => {
  const fromState = decodeOAuthState(req.query.state);
  const frontendUrl = fromState?.returnTo || resolveOAuthReturnUrl();

  if (fromState?.role) {
    (req as any).oauthRole = fromState.role;
  }

  passport.authenticate("google", { session: false }, (err: any, user: any) => {
    if (err) {
      const message = err?.message ?? String(err);
      console.error("Google OAuth callback error:", message);
      const errorCode = mapOAuthErrorCode(err);
      return res.redirect(`${frontendUrl}/?error=${errorCode}`);
    }

    if (!user) {
      console.error("Google OAuth callback: no user returned");
      return res.redirect(`${frontendUrl}/?error=google_login_failed`);
    }

    if (!process.env.JWT_SECRET) {
      console.error("Google OAuth callback: JWT_SECRET is not configured");
      return res.redirect(`${frontendUrl}/?error=google_login_failed`);
    }

    try {
      const u = user as any;
      const token = jwt.sign(
        { id: u.id, role: u.role },
        process.env.JWT_SECRET as string,
        { expiresIn: "7d" }
      );

      res.cookie("token", token, getCookieOptions());
      return res.redirect(`${frontendUrl}/?token=${token}`);
    } catch (signErr) {
      console.error("Google OAuth JWT sign error:", signErr);
      return res.redirect(`${frontendUrl}/?error=google_login_failed`);
    }
  })(req, res, next);
});

export default router;
