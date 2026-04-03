import { Router } from "express";
import { uploadImage } from "../controllers/uploadController";
import { authenticate } from "../middleware/authMiddleware";
import upload from "../middleware/uploadMiddleware";

const router = Router();

router.post("/", authenticate, upload.array("images", 3), uploadImage);

export default router;