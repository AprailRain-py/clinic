import { z } from "zod";

export const patientCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  age: z.coerce.number().int().min(0).max(130),
  dob: z
    .string()
    .max(32)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  firstVisitDate: z.string().min(1, "First visit date is required").max(32),
  conditions: z
    .array(z.string().min(1).max(200))
    .max(50)
    .optional()
    .default([]),
  notes: z.string().max(5000).optional().default(""),
});

export type PatientCreateInput = z.infer<typeof patientCreateSchema>;

// Legacy frequency enum kept for backward-compat reads (old visits serialized
// meal-timing into the frequency array). New writes use `dosing` + `mealTiming`.
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

export const dosingFrequencyEnum = z.enum(["OD", "BID", "TID", "QID", "SOS"]);
export const mealTimingEnum = z.enum([
  "before_food",
  "after_food",
  "empty_stomach",
  "at_bedtime",
]);

export const prescriptionItemSchema = z.object({
  medicineId: z.string().optional(),
  brand: z.string().min(1),
  generic: z.string().optional(),
  composition: z.string().optional(),
  form: z.string().optional(),
  strength: z.string().optional(),
  class: z.string().max(40).optional(),
  // Phase 4+ shape. `dosing: null` means the doctor hasn't selected yet and
  // the editor should have blocked save — accept only for read-path compat.
  dosing: dosingFrequencyEnum.nullable().optional(),
  mealTiming: mealTimingEnum.nullable().optional(),
  // Legacy array; required to exist (may be empty) for visits written before
  // Phase 4. Defaults to [] so the editor can stop populating it.
  frequency: z.array(frequencyEnum).default([]),
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
