import { z } from "zod";

export const staffCreateSchema = z.object({
  branchId: z.number().int().positive(),
  name: z.string().min(2).max(100),
  avatarUrl: z.string().url().optional(),
  serviceIds: z.array(z.number().int().positive()).min(1)
});
