import { Request, Response } from "express";
import prisma from "../config/prisma";
import PDFDocument from "pdfkit";

export const getDashboardStats = async (_req: Request, res: Response) => {
  try {
    const totalComplaints = await prisma.complaint.count();

    const resolvedComplaints = await prisma.complaint.count({
      where: {
        status: "RESOLVED"
      }
    });

    const pendingComplaints = await prisma.complaint.count({
      where: {
        status: {
          in: ["REPORTED", "ACKNOWLEDGED", "DISPATCHED", "IN_PROGRESS"]
        }
      }
    });

    const totalStaff = await prisma.staff.count();

    const complaintsByDepartment = await prisma.department.findMany({
      include: {
        _count: {
          select: {
            complaints: true
          }
        }
      }
    });

    return res.status(200).json({
      totalComplaints,
      resolvedComplaints,
      pendingComplaints,
      totalStaff,
      complaintsByDepartment
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch dashboard stats",
      error
    });
  }
};

export const exportComplaintPdf = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const complaintId = Number(id);

    if (!Number.isFinite(complaintId) || complaintId <= 0) {
      return res.status(400).json({ message: "Invalid complaint id" });
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        user: true,
        department: true,
        assignedStaff: true,
        statusHistory: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="complaint-${complaintId}.pdf"`
    );

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    doc.pipe(res);

    doc.fontSize(18).text("Smart Civic Issue Reporting System", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(12).text("Official Complaint Report", { align: "center" });
    doc.moveDown();

    doc.fontSize(12).text(`Complaint ID: ${complaint.id}`);
    doc.text(`Department: ${complaint.department?.name ?? "-"}`);
    doc.text(`Title: ${complaint.title}`);
    doc.text(`Severity: ${complaint.severity}`);
    doc.moveDown();

    doc.fontSize(12).text("Description:");
    doc.fontSize(11).text(complaint.description);
    doc.moveDown();

    doc.fontSize(12).text(`Location: ${complaint.location}`);
    doc.text(`Submitted By: ${complaint.user?.name ?? "-"} (${complaint.user?.email ?? "-"})`);
    if (complaint.assignedStaff) {
      doc.text(
        `Assigned Staff: ${complaint.assignedStaff.name} (Workload: ${complaint.assignedStaff.workload}/${complaint.assignedStaff.maxWorkload})`
      );
    } else {
      doc.text("Assigned Staff: -");
    }

    doc.moveDown();
    doc.fontSize(12).text("Status History:");

    complaint.statusHistory.forEach((h) => {
      const line = `- ${h.status} | ${new Date(h.createdAt).toLocaleString()}${
        h.note ? ` | Note: ${h.note}` : ""
      }`;
      doc.fontSize(11).text(line);
    });

    doc.end();
  } catch (error) {
    return res.status(500).json({ message: "Failed to export PDF", error });
  }
};