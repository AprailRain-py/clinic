import { z } from "zod";

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const optionalNullableString = (max: number) =>
  z.preprocess(
    emptyToUndefined,
    z.string().max(max).optional().nullable(),
  );

// Data URL must be a PNG or JPEG base64 payload and fit under 200KB of raw
// string (this also bounds the decoded image to roughly 150KB).
const signatureDataUrlSchema = z
  .preprocess(
    emptyToUndefined,
    z
      .string()
      .max(200_000)
      .refine(
        (v) =>
          v.startsWith("data:image/png;base64,") ||
          v.startsWith("data:image/jpeg;base64,"),
        { message: "signatureDataUrl must be a PNG or JPEG data URL" },
      )
      .optional()
      .nullable(),
  );

export const doctorUpsertSchema = z.object({
  clinicName: optionalNullableString(200),
  clinicAddress: optionalNullableString(500),
  clinicPhone: optionalNullableString(30),
  registrationNumber: optionalNullableString(50),
  degrees: z
    .array(z.string().min(1).max(100))
    .max(10)
    .optional()
    .default([]),
  specialty: optionalNullableString(100),
  timings: optionalNullableString(500),
  signatureDataUrl: signatureDataUrlSchema,
});

export type DoctorUpsertInput = z.infer<typeof doctorUpsertSchema>;
