import { Request, Response } from "express";
import prisma from "../config/prisma";
import { sendEmail } from "../utils/email";

export const assignComplaintToStaff = async (req: Request, res: Response) => {
  try {
    const { complaintId, staffId } = req.body;

    if (!complaintId || !staffId) {
      return res.status(400).json({ message: "complaintId and staffId are required" });
    }

    const complaintRecord = await prisma.complaint.findUnique({
      where: { id: Number(complaintId) },
      select: { id: true, departmentId: true, userId: true },
    });

    if (!complaintRecord) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const staffRecord = await prisma.staff.findUnique({
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

    const complaint = await prisma.complaint.update({
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

    await prisma.staff.update({
      where: {
        id: Number(staffId)
      },
      data: {
        workload: {
          increment: 1
        }
      }
    });

    await prisma.complaintStatusHistory.create({
      data: {
        complaintId: Number(complaintId),
        status: "DISPATCHED",
        note: "Complaint assigned to field staff"
      }
    });

    await prisma.notification.create({
      data: {
        userId: complaint.userId,
        message: `Complaint #${complaint.id} has been dispatched to ${complaint.assignedStaff?.name ?? "a staff member"}.`,
        complaintId: complaint.id,
      },
    });

    if (complaint.user?.email) {
      await sendEmail({
        to: complaint.user.email,
        subject: `Technician assigned for Complaint #${complaint.id}`,
        text: `A technician has been assigned to your complaint.\n\nTracking ID: ${complaint.id}\nDepartment: ${complaint.department?.name ?? "-"}\nAssigned Staff: ${complaint.assignedStaff?.name ?? "-"}\nStatus: DISPATCHED\n\nWe will notify you again when the status changes.`,
      });
    }

    return res.status(200).json({
      message: "Complaint assigned successfully",
      complaint
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to assign complaint",
      error
    });
  }
};