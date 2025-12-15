import { z } from "zod";

const isoDateValidator = z
  .string()
  .refine((input) => !Number.isNaN(Date.parse(input)), {
    message: "Musí být platný ISO 8601 řetězec"
  });

export const shiftSchema = z
  .object({
    staffId: z.number().int().positive(),
    branchId: z.number().int().positive(),
    startAtUtc: isoDateValidator,
    endAtUtc: isoDateValidator
  })
  .refine(
    (input) => new Date(input.startAtUtc) < new Date(input.endAtUtc),
    {
      message: "Shift musí končit po startu",
      path: ["endAtUtc"]
    }
  );

export const timeOffSchema = z
  .object({
    staffId: z.number().int().positive(),
    startAtUtc: isoDateValidator,
    endAtUtc: isoDateValidator,
    reason: z.string().max(200).optional()
  })
  .refine(
    (input) => new Date(input.startAtUtc) < new Date(input.endAtUtc),
    { message: "Time off musí končit po startu", path: ["endAtUtc"] }
  );
