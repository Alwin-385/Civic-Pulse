"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const departmentController_1 = require("../controllers/departmentController");
const router = (0, express_1.Router)();
router.get("/", departmentController_1.listDepartments);
exports.default = router;
