import { Response, Request } from "express";
import prisma from "../config/prisma";
import { AuthRequest } from "../middleware/authMiddleware";

export const createOrUpdateFeedback = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const complaintId = Number(req.params.id);
    const { rating, comment } = req.body as { rating: number; comment?: string };

    if (!Number.isFinite(complaintId) || complaintId <= 0) {
      return res.status(400).json({ message: "Invalid complaint id" });
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      select: { status: true, userId: true },
    });

    if (!complaint) return res.status(404).json({ message: "Complaint not found" });
    if (complaint.status !== "RESOLVED") {
      return res.status(400).json({ message: "Feedback is available only after resolution" });
    }
    if (complaint.userId !== req.user.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const feedback = await prisma.feedback.upsert({
      where: { complaintId },
      update: {
        rating,
        comment: comment?.trim() ? comment : null,
      },
      create: {
        complaintId,
        userId: req.user.id,
        rating,
        comment: comment?.trim() ? comment : null,
      },
    });

    return res.status(200).json({ message: "Feedback saved", feedback });
  } catch (error) {
    return res.status(500).json({ message: "Failed to save feedback", error });
  }
};

