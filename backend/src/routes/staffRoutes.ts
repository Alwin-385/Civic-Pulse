import { Router } from "express";
import {
  createStaff,
  getAllStaff,
  getStaffById,
  updateStaff,
  deleteStaff
} from "../controllers/staffController";
import { authenticate } from "../middleware/authMiddleware";
import { authorizeOfficial } from "../middleware/roleMiddleware";

const router = Router();

router.post("/", authenticate, authorizeOfficial, createStaff);
router.get("/", authenticate, authorizeOfficial, getAllStaff);
router.get("/:id", authenticate, authorizeOfficial, getStaffById);
router.put("/:id", authenticate, authorizeOfficial, updateStaff);
router.delete("/:id", authenticate, authorizeOfficial, deleteStaff);

export default router;