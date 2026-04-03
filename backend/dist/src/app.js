"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const express_session_1 = __importDefault(require("express-session"));
const passport_1 = __importDefault(require("passport"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const complaintRoutes_1 = __importDefault(require("./routes/complaintRoutes"));
const staffRoutes_1 = __importDefault(require("./routes/staffRoutes"));
const assignmentRoutes_1 = __importDefault(require("./routes/assignmentRoutes"));
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
const uploadRoutes_1 = __importDefault(require("./routes/uploadRoutes"));
const departmentRoutes_1 = __importDefault(require("./routes/departmentRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 200
});
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)("dev"));
app.use(limiter);
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use((0, express_session_1.default)({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
    },
}));
app.use(passport_1.default.initialize());
app.use(passport_1.default.session());
app.get("/", (_req, res) => {
    res.send("Civic Issue Backend API is running");
});
app.use("/api/auth", authRoutes_1.default);
app.use("/api/departments", departmentRoutes_1.default);
app.use("/api/notifications", notificationRoutes_1.default);
app.use("/api/complaints", complaintRoutes_1.default);
app.use("/api/staff", staffRoutes_1.default);
app.use("/api/assignments", assignmentRoutes_1.default);
app.use("/api/reports", reportRoutes_1.default);
app.use("/api/upload", uploadRoutes_1.default);
app.use(errorHandler_1.errorHandler);
exports.default = app;
