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
import { DATABASE_UNAVAILABLE_MESSAGE, isDatabaseSchemaError } from "./utils/dbError";
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
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  return res.status(200).json({
    googleClientIdSet: Boolean(clientId),
    googleClientIdPrefix: clientId ? clientId.slice(0, 12) + "..." : null,
    googleClientSecretSet: Boolean(process.env.GOOGLE_CLIENT_SECRET),
    jwtSecretSet: Boolean(process.env.JWT_SECRET),
    sessionSecretSet: Boolean(process.env.SESSION_SECRET),
    callbackUrl: getGoogleCallbackUrl(),
    frontendUrl: getFrontendUrl(),
    hint: "googleClientIdPrefix must start with 423199778935 after you update Render with the new Google client",
  });
});

app.get("/api/health", async (_req, res) => {
  try {
    await Promise.race([
      prisma.user.count(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Database connection timed out")), 20000)
      ),
    ]);
    return res.status(200).json({ ok: true, database: "connected" });
  } catch (err) {
    if (isDatabaseSchemaError(err)) {
      return res.status(503).json({
        ok: false,
        database: "schema_outdated",
        message: "Database schema is outdated. Redeploy Render to run prisma db push.",
      });
    }
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