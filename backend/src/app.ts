import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "passport";

import authRoutes from "./routes/authRoutes";
import complaintRoutes from "./routes/complaintRoutes";
import staffRoutes from "./routes/staffRoutes";
import assignmentRoutes from "./routes/assignmentRoutes";
import reportRoutes from "./routes/reportRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import departmentRoutes from "./routes/departmentRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import { errorHandler } from "./middleware/errorHandler";
import prisma from "./config/prisma";
import { DATABASE_UNAVAILABLE_MESSAGE } from "./utils/dbError";
import { getFrontendUrl, getGoogleCallbackUrl, isProduction } from "./config/env";

const app = express();

// Required on Render/Heroku so secure cookies and sessions work behind the proxy.
app.set("trust proxy", 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000
});

app.use(helmet());
app.use(morgan("dev"));
app.use(limiter);
app.use(
  cors({
    origin: [
      process.env.CORS_ORIGIN || "http://localhost:3000",
      getFrontendUrl(),
      "https://civic-pulse-platform.vercel.app",
      /\.vercel\.app$/,
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET as string,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.get("/", (_req, res) => {
  res.send("Civic Issue Backend API is running");
});

app.get("/api/health/oauth", (_req, res) => {
  return res.status(200).json({
    googleClientIdSet: Boolean(process.env.GOOGLE_CLIENT_ID),
    googleClientSecretSet: Boolean(process.env.GOOGLE_CLIENT_SECRET),
    jwtSecretSet: Boolean(process.env.JWT_SECRET),
    sessionSecretSet: Boolean(process.env.SESSION_SECRET),
    callbackUrl: getGoogleCallbackUrl(),
    frontendUrl: getFrontendUrl(),
  });
});

app.get("/api/health", async (_req, res) => {
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database connection timed out")), 5000)
      ),
    ]);
    return res.status(200).json({ ok: true, database: "connected" });
  } catch {
    return res.status(503).json({ ok: false, database: "unavailable", message: DATABASE_UNAVAILABLE_MESSAGE });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/upload", uploadRoutes);

app.use(errorHandler);

export default app;