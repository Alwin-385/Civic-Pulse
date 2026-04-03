"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notificationController_1 = require("../controllers/notificationController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.get("/", authMiddleware_1.authenticate, notificationController_1.getMyNotifications);
router.patch("/read-all", authMiddleware_1.authenticate, notificationController_1.markAllMyNotificationsRead);
exports.default = router;
