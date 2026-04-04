import { Router } from "express";
import jwt from "jsonwebtoken";
import passport from "passport";
import { login, logout, me, register, verifyEmailOtp, updateMe, resendOtp } from "../controllers/authController";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/verify-email", verifyEmailOtp);
router.post("/resend-otp", resendOtp);
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

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_ORIGIN ?? "http://localhost:3000"}/`,
    session: false,
  }),
  (req, res) => {
    const user = (req as any).user as any;
    if (!user) {
      return res.redirect(`${process.env.FRONTEND_ORIGIN ?? "http://localhost:3000"}/`);
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(`${process.env.FRONTEND_ORIGIN ?? "http://localhost:3000"}/`);
  }
);

export default router;