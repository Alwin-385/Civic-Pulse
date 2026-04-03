"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignComplaintToStaff = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const email_1 = require("../utils/email");
const assignComplaintToStaff = async (req, res) => {
    try {
        const { complaintId, staffId } = req.body;
        if (!complaintId || !staffId) {
            return res.status(400).json({ message: "complaintId and staffId are required" });
        }
        const complaintRecord = await prisma_1.default.complaint.findUnique({
            where: { id: Number(complaintId) },
            select: { id: true, departmentId: true, userId: true },
        });
        if (!complaintRecord) {
            return res.status(404).json({ message: "Complaint not found" });
        }
        const staffRecord = await prisma_1.default.staff.findUnique({
            where: { id: Number(staffId) },
            select: { id: true, departmentId: true },
        });
        if (!staffRecord) {
            return res.status(404).json({ message: "Staff not found" });
        }
        if (complaintRecord.departmentId !== staffRecord.departmentId) {
            return res.status(400).json({
                message: "Staff must belong to the same department as the complaint",
            });
        }
        const complaint = await prisma_1.default.complaint.update({
            where: { id: Number(complaintId) },
            data: {
                assignedStaffId: Number(staffId),
                status: "DISPATCHED",
            },
            include: {
                assignedStaff: true,
                department: true,
                user: true,
            },
        });
        await prisma_1.default.staff.update({
            where: {
                id: Number(staffId)
            },
            data: {
                workload: {
                    increment: 1
                }
            }
        });
        await prisma_1.default.complaintStatusHistory.create({
            data: {
                complaintId: Number(complaintId),
                status: "DISPATCHED",
                note: "Complaint assigned to field staff"
            }
        });
        await prisma_1.default.notification.create({
            data: {
                userId: complaint.userId,
                message: `Complaint #${complaint.id} has been dispatched to ${complaint.assignedStaff?.name ?? "a staff member"}.`,
                complaintId: complaint.id,
            },
        });
        if (complaint.user?.email) {
            await (0, email_1.sendEmail)({
                to: complaint.user.email,
                subject: `Technician assigned for Complaint #${complaint.id}`,
                text: `A technician has been assigned to your complaint.\n\nTracking ID: ${complaint.id}\nDepartment: ${complaint.department?.name ?? "-"}\nAssigned Staff: ${complaint.assignedStaff?.name ?? "-"}\nStatus: DISPATCHED\n\nWe will notify you again when the status changes.`,
            });
        }
        return res.status(200).json({
            message: "Complaint assigned successfully",
            complaint
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Failed to assign complaint",
            error
        });
    }
};
exports.assignComplaintToStaff = assignComplaintToStaff;
