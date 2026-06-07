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
import { getCookieOptions, getOAuthCookieOptions, resolveOAuthReturnUrl } from "../config/env";

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

  res.cookie("oauth_return_to", resolvedReturnTo, getOAuthCookieOptions());
  res.cookie("oauth_role", role, getOAuthCookieOptions());

  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })(req, res, next);
});

router.get("/google/callback", (req: Request, res: Response, next: NextFunction) => {
  const cookies = (req as any).cookies ?? {};
  const frontendUrl =
    cookies.oauth_return_to ||
    ((req as any).session as any)?.oauthReturnTo ||
    resolveOAuthReturnUrl();

  if (cookies.oauth_role) {
    (req as any).oauthRole = cookies.oauth_role;
  } else if ((req as any).session?.oauthRole) {
    (req as any).oauthRole = (req as any).session.oauthRole;
  }

  const clearOAuthCookies = () => {
    res.clearCookie("oauth_return_to", getCookieOptions());
    res.clearCookie("oauth_role", getCookieOptions());
  };

  passport.authenticate("google", { session: false }, (err: any, user: any) => {
    clearOAuthCookies();

    if (err) {
      const message = err?.message ?? String(err);
      console.error("Google OAuth callback error:", message, err);
      const errorCode = isDatabaseConnectionError(err)
        ? "database_unavailable"
        : message.toLowerCase().includes("state")
          ? "oauth_state"
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
