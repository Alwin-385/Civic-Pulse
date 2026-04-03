import { Router } from "express";
import { exportComplaintPdf, getDashboardStats } from "../controllers/reportController";
import { authenticate } from "../middleware/authMiddleware";
import { authorizeOfficial } from "../middleware/roleMiddleware";

const router = Router();

router.get("/dashboard", authenticate, authorizeOfficial, getDashboardStats);
router.get(
  "/complaints/:id/pdf",
  authenticate,
  authorizeOfficial,
  exportComplaintPdf
);

export default router;