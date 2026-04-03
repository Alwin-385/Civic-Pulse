import { Router } from "express";
import { assignComplaintToStaff } from "../controllers/assignmentController";
import { authenticate } from "../middleware/authMiddleware";
import { authorizeOfficial } from "../middleware/roleMiddleware";

const router = Router();

router.post("/", authenticate, authorizeOfficial, assignComplaintToStaff);

export default router;