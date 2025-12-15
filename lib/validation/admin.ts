import { z } from "zod";

const positiveInt = z.preprocess(
  (value) => (typeof value === "string" ? Number(value) : value),
  z.number().int().positive()
);

export const branchCreateSchema = z.object({
  name: z.string().min(2).max(120).transform((value) => value.trim()),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "slug musí obsahovat pouze a-z, 0-9 a pomlčku")
    .transform((value) => value.trim()),
  timezone: z.string().min(1),
  address: z.string().min(2).max(200).optional(),
  city: z.string().min(2).max(120).optional(),
  phone: z.string().min(5).max(50).optional(),
  email: z.string().email().optional(),
  bookingBufferMin: positiveInt.optional(),
  slotStepMin: positiveInt.optional(),
  maxDaysAhead: positiveInt.optional(),
  allowPayOnSite: z.boolean().optional(),
  allowPayOnline: z.boolean().optional()
});

export const serviceCreateSchema = z.object({
  name: z.string().min(2).max(120).transform((value) => value.trim()),
  category: z.string().min(2).max(120).transform((value) => value.trim()),
  durationMin: positiveInt,
  description: z.string().max(500).optional()
});

export const branchServiceUpsertSchema = z.object({
  branchId: positiveInt,
  serviceId: positiveInt,
  priceCents: positiveInt
});
