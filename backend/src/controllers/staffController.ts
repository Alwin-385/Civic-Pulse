import { Request, Response } from "express";
import prisma from "../config/prisma";

export const createStaff = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      role,
      status,
      workload,
      maxWorkload,
      location,
      phone,
      avatarUrl,
      departmentId
    } = req.body;

    if (!name || !role || !status || !departmentId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const staff = await prisma.staff.create({
      data: {
        name,
        email,
        role,
        status,
        workload: workload ?? 0,
        maxWorkload: maxWorkload ?? 5,
        location,
        phone,
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
  } catch (error) {
    return res.status(500).json({
      message: "Failed to create staff",
      error
    });
  }
};

export const getAllStaff = async (_req: Request, res: Response) => {
  try {
    const staff = await prisma.staff.findMany({
      include: {
        department: true,
        assignments: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return res.status(200).json(staff);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch staff",
      error
    });
  }
};

export const getStaffById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const staff = await prisma.staff.findUnique({
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
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch staff",
      error
    });
  }
};

export const updateStaff = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const updatedStaff = await prisma.staff.update({
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
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update staff",
      error
    });
  }
};

export const deleteStaff = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.staff.delete({
      where: {
        id: Number(id)
      }
    });

    return res.status(200).json({
      message: "Staff deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete staff",
      error
    });
  }
};