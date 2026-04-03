"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteStaff = exports.updateStaff = exports.getStaffById = exports.getAllStaff = exports.createStaff = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const createStaff = async (req, res) => {
    try {
        const { name, email, role, status, workload, maxWorkload, location, avatarUrl, departmentId } = req.body;
        if (!name || !role || !status || !departmentId) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        const staff = await prisma_1.default.staff.create({
            data: {
                name,
                email,
                role,
                status,
                workload: workload ?? 0,
                maxWorkload: maxWorkload ?? 5,
                location,
                avatarUrl,
                departmentId: Number(departmentId)
            },
            include: {
                department: true
            }
        });
        return res.status(201).json({
            message: "Staff created successfully",
            staff
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Failed to create staff",
            error
        });
    }
};
exports.createStaff = createStaff;
const getAllStaff = async (_req, res) => {
    try {
        const staff = await prisma_1.default.staff.findMany({
            include: {
                department: true,
                assignments: true
            },
            orderBy: {
                createdAt: "desc"
            }
        });
        return res.status(200).json(staff);
    }
    catch (error) {
        return res.status(500).json({
            message: "Failed to fetch staff",
            error
        });
    }
};
exports.getAllStaff = getAllStaff;
const getStaffById = async (req, res) => {
    try {
        const { id } = req.params;
        const staff = await prisma_1.default.staff.findUnique({
            where: {
                id: Number(id)
            },
            include: {
                department: true,
                assignments: true
            }
        });
        if (!staff) {
            return res.status(404).json({ message: "Staff not found" });
        }
        return res.status(200).json(staff);
    }
    catch (error) {
        return res.status(500).json({
            message: "Failed to fetch staff",
            error
        });
    }
};
exports.getStaffById = getStaffById;
const updateStaff = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedStaff = await prisma_1.default.staff.update({
            where: {
                id: Number(id)
            },
            data: req.body,
            include: {
                department: true
            }
        });
        return res.status(200).json({
            message: "Staff updated successfully",
            staff: updatedStaff
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Failed to update staff",
            error
        });
    }
};
exports.updateStaff = updateStaff;
const deleteStaff = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.default.staff.delete({
            where: {
                id: Number(id)
            }
        });
        return res.status(200).json({
            message: "Staff deleted successfully"
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Failed to delete staff",
            error
        });
    }
};
exports.deleteStaff = deleteStaff;
