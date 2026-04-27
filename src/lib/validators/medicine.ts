import { z } from "zod";

export const MEDICINE_FORMS = [
  "tablet",
  "syrup",
  "capsule",
  "injection",
  "ointment",
  "drops",
  "powder",
] as const;

export const MEDICINE_SYSTEMS = [
  "allopathic",
  "ayurvedic",
  "homeopathic",
] as const;

export type MedicineForm = (typeof MEDICINE_FORMS)[number];
export type MedicineSystem = (typeof MEDICINE_SYSTEMS)[number];

const optionalTrimmed = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .transform((v) => {
      if (v === undefined || v === null) return undefined;
      const trimmed = v.trim();
      return trimmed.length === 0 ? undefined : trimmed;
    });

export const medicineCreateSchema = z.object({
  brand: z
    .string()
    .min(1, "Brand name is required")
    .max(200)
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, { message: "Brand name is required" }),
  generic: optionalTrimmed(200),
  composition: optionalTrimmed(1000),
  form: z
    .string()
    .max(32)
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined))
    .refine(
      (v) => v === undefined || (MEDICINE_FORMS as readonly string[]).includes(v),
      { message: "Invalid form" },
    ),
  strength: optionalTrimmed(120),
  manufacturer: optionalTrimmed(200),
  system: z
    .string()
    .max(32)
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : "allopathic"))
    .refine(
      (v) => (MEDICINE_SYSTEMS as readonly string[]).includes(v),
      { message: "Invalid system" },
    ),
});

export type MedicineCreateInput = z.infer<typeof medicineCreateSchema>;
