import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware";

export const authorizeOfficial = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "OFFICIAL") {
    return res.status(403).json({ message: "Access denied. Officials only." });
  }

  next();
};

export const authorizeCitizen = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.user.role !== "CITIZEN") {
    return res.status(403).json({ message: "Access denied. Citizens only." });
  }

  next();
};