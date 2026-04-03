import { Request, Response } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/authMiddleware";
import { ComplaintStatus } from "@prisma/client";
import { sendEmail } from "../utils/email";

export const createComplaint = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, location, latitude, longitude, severity, departmentId, imageUrl } =
      req.body;

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!title || !description || !location || !severity || !departmentId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const complaint = await prisma.complaint.create({
      data: {
        title,
        description,
        location,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        severity,
        imageUrl,
        userId: req.user.id,
        departmentId: Number(departmentId),
      },
      include: {
        user: true,
        department: true,
      },
    });

    await prisma.complaintStatusHistory.create({
      data: {
        complaintId: complaint.id,
        status: "REPORTED",
        note: "Complaint created by user",
      },
    });

    // Cursor's TS diagnostics sometimes lag Prisma client generation; runtime type is correct.
    await (prisma as any).notification.create({
      data: {
        userId: req.user.id,
        message: `Complaint #${complaint.id} submitted. Status: REPORTED.`,
        complaintId: complaint.id,
      },
    });

    await sendEmail({
      to: complaint.user.email,
      subject: `Complaint submitted (#${complaint.id})`,
      text: `Your complaint has been submitted.\n\nTracking ID: ${complaint.id}\nStatus: REPORTED\nDepartment: ${complaint.department?.name ?? "-"}\n\nWe will notify you when a technician is assigned and the status changes.`,
    });

    return res.status(201).json({
      message: "Complaint created successfully",
      complaint,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create complaint",
      error,
    });
  }
};

export const getAllComplaints = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { email: true, role: true },
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const { status, timeframe, searchLocation } = req.query;

    let filter: any = {};
    if (user.role === "OFFICIAL") {
      const email = user.email.toLowerCase();
      if (email.includes("kseb")) {
        filter.department = { name: "KSEB" };
      } else if (email.includes("pwd")) {
        filter.department = { name: "PWD" };
      }
    }

    if (status && status !== 'ALL') {
      filter.status = status;
    }
    
    if (searchLocation) {
      filter.location = { contains: searchLocation as string, mode: "insensitive" };
    }

    if (timeframe && timeframe !== 'all') {
      const date = new Date();
      if (timeframe === 'day') date.setDate(date.getDate() - 1);
      if (timeframe === 'week') date.setDate(date.getDate() - 7);
      if (timeframe === 'month') date.setMonth(date.getMonth() - 1);
      filter.createdAt = { gte: date };
    }

    const complaints = await prisma.complaint.findMany({
      where: filter,
      include: {
        user: true,
        department: true,
        assignedStaff: true,
        statusHistory: { include: { updatedBy: true }, orderBy: { createdAt: "desc" } },
        feedback: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json(complaints);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch complaints",
      error,
    });
  }
};

export const getComplaintById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const complaint = await prisma.complaint.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        user: true,
        department: true,
        assignedStaff: true,
        statusHistory: { include: { updatedBy: true }, orderBy: { createdAt: "desc" } },
        feedback: true,
      },
    });

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    return res.status(200).json(complaint);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch complaint",
      error,
    });
  }
};

export const getMyComplaints = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const complaints = await prisma.complaint.findMany({
      where: { userId: req.user.id },
      include: {
        department: true,
        assignedStaff: true,
        statusHistory: { include: { updatedBy: true }, orderBy: { createdAt: "desc" } },
        feedback: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json(complaints);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch my complaints",
      error,
    });
  }
};

export const getMyComplaintById = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const complaint = await prisma.complaint.findUnique({
      where: {
        id: Number(id),
      },
      include: {
        department: true,
        assignedStaff: true,
        statusHistory: {
          orderBy: { createdAt: "desc" },
        },
        feedback: true,
      },
    });

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (complaint.userId !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.status(200).json(complaint);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch complaint",
      error,
    });
  }
};

export const updateComplaintStatus = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const complaintId = Number(id);
    const existingComplaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: { assignedStaffId: true, userId: true },
    });

    if (!existingComplaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const updatedComplaint = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: status as ComplaintStatus,
        assignedStaffId: status === "RESOLVED" ? null : undefined,
      },
    });

    if (status === "RESOLVED" && existingComplaint.assignedStaffId) {
      await prisma.staff.update({
        where: { id: existingComplaint.assignedStaffId },
        data: { workload: { decrement: 1 } },
      });
    }

    await prisma.complaintStatusHistory.create({
      data: {
        complaintId: complaintId,
        status: status as ComplaintStatus,
        note: note || "Status updated",
        updatedById: req.user.id,
      },
    });



    // Cursor's TS diagnostics sometimes lag Prisma client generation; runtime type is correct.
    await (prisma as any).notification.create({
      data: {
        userId: existingComplaint.userId,
        message: `Complaint #${complaintId} status updated to ${status}.`,
        complaintId: complaintId,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: existingComplaint.userId },
      select: { email: true },
    });

    if (user?.email) {
      const statusLabel =
        status === "RESOLVED"
          ? "Resolved"
          : status === "IN_PROGRESS"
            ? "In Progress"
            : status === "ACKNOWLEDGED"
              ? "Acknowledged"
              : String(status);

      await sendEmail({
        to: user.email,
        subject: `Complaint #${complaintId} status: ${statusLabel}`,
        text: `Update for your complaint.\n\nTracking ID: ${complaintId}\nStatus: ${statusLabel}\n\n${
          note ? `Note: ${note}\n` : ""
        }Thank you for using Civic Connect.`,
      });
    }

    return res.status(200).json({
      message: "Complaint status updated successfully",
      complaint: updatedComplaint,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update complaint status",
      error,
    });
  }
};