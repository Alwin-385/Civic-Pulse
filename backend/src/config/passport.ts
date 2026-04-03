import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import prisma from "./prisma";

export const configurePassport = () => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID as string,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        callbackURL: process.env.GOOGLE_REDIRECT_URL as string,
        passReqToCallback: true,
      },
      async (
        req: any,
        _accessToken: string,
        _refreshToken: string,
        profile: any,
        done: (err: any, user?: any) => void
      ) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error("Google profile has no email"), undefined);
          }

          const googleId = profile.id;
          const roleFromSession = (req.session as any)?.oauthRole;

          const userRole = roleFromSession === "OFFICIAL" ? "OFFICIAL" : "CITIZEN";

          const existingByGoogle = await prisma.user.findUnique({
            where: { googleId },
          });

          const existingByEmail = await prisma.user.findUnique({
            where: { email },
          });

          let user = existingByGoogle ?? existingByEmail;

          if (!user) {
            // password is required by schema; use a random placeholder.
            user = await prisma.user.create({
              data: {
                name: profile.displayName ?? email.split("@")[0],
                email,
                password: "google-oauth-placeholder",
                role: userRole,
                emailVerifiedAt: new Date(),
                googleId,
              },
            });
          } else {
            user = await prisma.user.update({
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
        } catch (e) {
          return done(e as any, undefined);
        }
      }
    )
  );

  // For our flow we only need req.user in the callback route handler.
  passport.serializeUser((user: any, cb: (err: any, id?: any) => void) => cb(null, user.id));
  passport.deserializeUser(async (id: number, cb: (err: any, user?: any) => void) => {
    try {
      const u = await prisma.user.findUnique({ where: { id } });
      cb(null, u ?? null);
    } catch (e) {
      cb(e as any, null);
    }
  });
};

