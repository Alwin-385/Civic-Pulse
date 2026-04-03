import { Router } from "express";
import {
  createComplaint,
  getAllComplaints,
  getComplaintById,
  getMyComplaints,
  getMyComplaintById,
  updateComplaintStatus
} from "../controllers/complaintController";
import { authenticate } from "../middleware/authMiddleware";
import { authorizeCitizen, authorizeOfficial } from "../middleware/roleMiddleware";
import { createOrUpdateFeedback } from "../controllers/feedbackController";

const router = Router();

router.post("/", authenticate, authorizeCitizen, createComplaint);

// Citizen-scoped routes
router.get("/mine", authenticate, authorizeCitizen, getMyComplaints);
router.get("/mine/:id", authenticate, authorizeCitizen, getMyComplaintById);

// Official-scoped routes
router.get("/", authenticate, authorizeOfficial, getAllComplaints);
router.get("/:id", authenticate, authorizeOfficial, getComplaintById);
router.patch("/:id/status", authenticate, authorizeOfficial, updateComplaintStatus);

// Citizen feedback after resolution
router.post("/:id/feedback", authenticate, authorizeCitizen, createOrUpdateFeedback);

export default router;