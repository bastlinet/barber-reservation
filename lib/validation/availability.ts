import { z } from "zod";

const positiveInteger = z.number().int().positive();

const parseYearMonthDay = z.preprocess((value) => {
  if (typeof value === "string") {
    return Number(value);
  }
  return value;
}, positiveInteger);

const staffIdSchema = z
  .preprocess((value) => {
    if (value === "any") {
      return "any";
    }

    if (typeof value === "string") {
      return Number(value);
    }

    return value;
  },
  z.union([z.literal("any"), positiveInteger])
).optional();

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Date must be valid"
  });

export const availabilityQuerySchema = z.object({
  branchId: parseYearMonthDay,
  serviceId: parseYearMonthDay,
  staffId: staffIdSchema,
  date: isoDate
});
