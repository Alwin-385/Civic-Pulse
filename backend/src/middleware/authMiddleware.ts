import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: Express.User;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = (req as any).cookies?.token as string | undefined;

    let token: string | undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (cookieToken) {
      token = cookieToken;
    }

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as { id: number; role: string };

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token", error });
  }
};