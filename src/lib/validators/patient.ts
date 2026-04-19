import { z } from "zod";

export const patientCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.coerce.number().int().min(0).max(150),
  dob: z
    .string()
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  firstVisitDate: z.string().min(1, "First visit date is required"),
  conditions: z.array(z.string().min(1)).optional().default([]),
  notes: z.string().optional().default(""),
});

export type PatientCreateInput = z.infer<typeof patientCreateSchema>;

export const frequencyEnum = z.enum([
  "before_breakfast",
  "after_breakfast",
  "before_lunch",
  "after_lunch",
  "before_dinner",
  "after_dinner",
  "empty_stomach",
  "before_sleep",
]);

export const prescriptionItemSchema = z.object({
  medicineId: z.string().optional(),
  brand: z.string().min(1),
  generic: z.string().optional(),
  composition: z.string().optional(),
  form: z.string().optional(),
  strength: z.string().optional(),
  frequency: z.array(frequencyEnum),
  timesPerDay: z.coerce.number().int().min(0).max(12),
  durationDays: z.coerce.number().int().min(0).max(365),
  notes: z.string().optional(),
});

export const prescriptionDocumentSchema = z.object({
  items: z.array(prescriptionItemSchema),
  freeText: z.string(),
});

export const visitCreateSchema = z.object({
  visitDate: z.string().min(1),
  prescription: prescriptionDocumentSchema,
});

export type VisitCreateInput = z.infer<typeof visitCreateSchema>;
