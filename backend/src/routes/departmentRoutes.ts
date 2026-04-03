import { Router } from "express";
import { listDepartments } from "../controllers/departmentController";

const router = Router();

router.get("/", listDepartments);

export default router;

