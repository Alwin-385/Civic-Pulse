import { z } from "zod";

export const complaintSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  location: z.string().min(3),
  severity: z.string().min(1),
  departmentId: z.number(),
  imageUrl: z.string().url().optional()
});