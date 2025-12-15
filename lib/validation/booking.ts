import { z } from "zod";

const positiveInteger = z.preprocess(
  (value) => (typeof value === "string" ? Number(value) : value),
  z.number().int().positive()
);

const isoDateTime = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "startAtUtc must be a valid ISO 8601 string"
  });

const optionalTrimmed = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess(
    (value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed.length === 0 ? undefined : trimmed;
      }

      return value;
    },
    schema.optional()
  );

export const bookingHoldSchema = z.object({
  branchId: positiveInteger,
  serviceId: positiveInteger,
  staffId: positiveInteger,
  startAtUtc: isoDateTime,
  clientFingerprint: optionalTrimmed(z.string().min(6).max(200)),
  paymentIntentId: optionalTrimmed(z.string().min(5).max(200))
});

export const bookingConfirmSchema = z
  .object({
    holdId: positiveInteger,
    customerName: z
      .string()
      .min(2)
      .max(120)
      .transform((value) => value.trim()),
    customerEmail: optionalTrimmed(z.string().email()),
    customerPhone: optionalTrimmed(z.string().min(5).max(50)),
    note: optionalTrimmed(z.string().max(500))
  })
  .refine(
    (value) => Boolean(value.customerEmail || value.customerPhone),
    {
      message: "customerEmail nebo customerPhone musí být vyplněné",
      path: ["customerEmail"]
    }
  );

export const bookingNoShowSchema = z.object({
  bookingId: positiveInteger
});
