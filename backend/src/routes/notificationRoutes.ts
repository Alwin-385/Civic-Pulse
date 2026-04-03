import { Router } from "express";
import { getMyNotifications, markAllMyNotificationsRead } from "../controllers/notificationController";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();

router.get("/", authenticate, getMyNotifications);
router.patch("/read-all", authenticate, markAllMyNotificationsRead);

export default router;

