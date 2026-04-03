"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDepartments = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const listDepartments = async (_req, res) => {
    try {
        const departments = await prisma_1.default.department.findMany({
            orderBy: { id: "asc" },
        });
        return res.status(200).json(departments);
    }
    catch (error) {
        return res.status(500).json({
            message: "Failed to fetch departments",
            error,
        });
    }
};
exports.listDepartments = listDepartments;
