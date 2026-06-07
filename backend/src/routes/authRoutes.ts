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
import { isDatabaseConnectionError } from "../utils/dbError";
import { getCookieOptions, resolveOAuthReturnUrl } from "../config/env";
import { decodeOAuthState, encodeOAuthState } from "../utils/oauthState";

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

  ((req as any).session as any).oauthRole = role;
  ((req as any).session as any).oauthReturnTo = resolvedReturnTo;

  const state = encodeOAuthState({ returnTo: resolvedReturnTo, role });

  const proceed = () => {
    passport.authenticate("google", {
      scope: ["profile", "email"],
      prompt: "select_account",
      state,
    })(req, res, next);
  };

  const session = (req as any).session;
  if (session?.save) {
    session.save((err: Error | null) => {
      if (err) console.error("Session save before Google OAuth failed:", err);
      proceed();
    });
    return;
  }

  proceed();
});

router.get("/google/callback", (req: Request, res: Response, next: NextFunction) => {
  const fromState = decodeOAuthState(req.query.state);
  const frontendUrl =
    fromState?.returnTo ||
    ((req as any).session as any)?.oauthReturnTo ||
    resolveOAuthReturnUrl();

  if (fromState?.role) {
    (req as any).oauthRole = fromState.role;
  } else if ((req as any).session?.oauthRole) {
    (req as any).oauthRole = (req as any).session.oauthRole;
  }

  passport.authenticate("google", { session: false }, (err: any, user: any) => {
    if (err) {
      console.error("Google OAuth callback error:", err);
      const errorCode = isDatabaseConnectionError(err)
        ? "database_unavailable"
        : "google_login_failed";
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

    const u = user as any;
    const token = jwt.sign(
      { id: u.id, role: u.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, getCookieOptions());

    return res.redirect(`${frontendUrl}/?token=${token}`);
  })(req, res, next);
});

export default router;
