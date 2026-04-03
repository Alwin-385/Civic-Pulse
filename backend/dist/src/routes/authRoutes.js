"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const passport_1 = __importDefault(require("passport"));
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.post("/register", authController_1.register);
router.post("/login", authController_1.login);
router.post("/verify-email", authController_1.verifyEmailOtp);
router.get("/me", authMiddleware_1.authenticate, authController_1.me);
router.post("/logout", authController_1.logout);
router.get("/google", (req, res, next) => {
    const role = req.query.role === "OFFICIAL" ? "OFFICIAL" : "CITIZEN";
    req.session.oauthRole = role;
    passport_1.default.authenticate("google", {
        scope: ["profile", "email"],
        prompt: "select_account",
    })(req, res, next);
});
router.get("/google/callback", passport_1.default.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_ORIGIN ?? "http://localhost:3000"}/`,
    session: false,
}), (req, res) => {
    const user = req.user;
    if (!user) {
        return res.redirect(`${process.env.FRONTEND_ORIGIN ?? "http://localhost:3000"}/`);
    }
    const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.cookie("token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.redirect(`${process.env.FRONTEND_ORIGIN ?? "http://localhost:3000"}/`);
});
exports.default = router;
