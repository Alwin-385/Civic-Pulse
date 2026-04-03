import { Request, Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/authMiddleware";

export const getMyNotifications = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.status(200).json(notifications);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch notifications",
      error,
    });
  }
};

export const markAllMyNotificationsRead = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to mark notifications as read",
      error,
    });
  }
};

