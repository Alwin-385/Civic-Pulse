"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAllMyNotificationsRead = exports.getMyNotifications = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const getMyNotifications = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: "Unauthorized" });
        const notifications = await prisma_1.default.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: "desc" },
            take: 50,
        });
        return res.status(200).json(notifications);
    }
    catch (error) {
        return res.status(500).json({
            message: "Failed to fetch notifications",
            error,
        });
    }
};
exports.getMyNotifications = getMyNotifications;
const markAllMyNotificationsRead = async (req, res) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: "Unauthorized" });
        await prisma_1.default.notification.updateMany({
            where: {
                userId: req.user.id,
                readAt: null,
            },
            data: {
                readAt: new Date(),
            },
        });
        return res.status(200).json({ message: "All notifications marked as read" });
    }
    catch (error) {
        return res.status(500).json({
            message: "Failed to mark notifications as read",
            error,
        });
    }
};
exports.markAllMyNotificationsRead = markAllMyNotificationsRead;
