"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configurePassport = void 0;
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const prisma_1 = __importDefault(require("./prisma"));
const configurePassport = () => {
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_REDIRECT_URL,
        passReqToCallback: true,
    }, async (req, _accessToken, _refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
                return done(new Error("Google profile has no email"), undefined);
            }
            const googleId = profile.id;
            const roleFromSession = req.session?.oauthRole;
            const userRole = roleFromSession === "OFFICIAL" ? "OFFICIAL" : "CITIZEN";
            const existingByGoogle = await prisma_1.default.user.findUnique({
                where: { googleId },
            });
            const existingByEmail = await prisma_1.default.user.findUnique({
                where: { email },
            });
            let user = existingByGoogle ?? existingByEmail;
            if (!user) {
                // password is required by schema; use a random placeholder.
                user = await prisma_1.default.user.create({
                    data: {
                        name: profile.displayName ?? email.split("@")[0],
                        email,
                        password: "google-oauth-placeholder",
                        role: userRole,
                        emailVerifiedAt: new Date(),
                        googleId,
                    },
                });
            }
            else {
                user = await prisma_1.default.user.update({
                    where: { id: user.id },
                    data: {
                        googleId,
                        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
                        role: userRole ?? user.role,
                        name: profile.displayName ?? user.name,
                    },
                });
            }
            return done(null, user);
        }
        catch (e) {
            return done(e, undefined);
        }
    }));
    // For our flow we only need req.user in the callback route handler.
    passport_1.default.serializeUser((user, cb) => cb(null, user.id));
    passport_1.default.deserializeUser(async (id, cb) => {
        try {
            const u = await prisma_1.default.user.findUnique({ where: { id } });
            cb(null, u ?? null);
        }
        catch (e) {
            cb(e, null);
        }
    });
};
exports.configurePassport = configurePassport;
