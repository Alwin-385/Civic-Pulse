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

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000
});

app.use(helmet());
app.use(morgan("dev"));
app.use(limiter);
app.use(
  cors({
    origin: [process.env.CORS_ORIGIN || "http://localhost:3000", "https://civic-pulse-platform.vercel.app", /\.vercel\.app$/],
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
      sameSite: "lax",
      secure: false,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.get("/", (_req, res) => {
  res.send("Civic Issue Backend API is running");
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