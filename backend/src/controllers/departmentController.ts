import { Request, Response } from "express";
import prisma from "../config/prisma";

export const listDepartments = async (_req: Request, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { id: "asc" },
    });

    return res.status(200).json(departments);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch departments",
      error,
    });
  }
};

