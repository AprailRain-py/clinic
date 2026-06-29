import { z } from "zod";

// ---------------------------------------------------------------------------
// Oral cancer screening — questionnaire validators.
//
// Field ids and option sets mirror docs/oral-screening-spec.v1.json. The
// inferred types here are the canonical "answers" contract that the triage
// rule engine (src/lib/screening) consumes — keep the two in lockstep.
//
// CLINICAL CONTENT IS v1 DRAFT — the reviewing oncologist ratifies before any
// real clinical use. This layer only validates shape, not clinical truth.
// ---------------------------------------------------------------------------

export const pathwayEnum = z.enum(["oral", "skin"]);

// ----- risk factors -----
export const habitStatusEnum = z.enum(["never", "past", "current"]);
export const smokedTypeEnum = z.enum([
  "bidi",
  "cigarette",
  "hookah",
  "reverse_smoking",
]);
export const smokelessTypeEnum = z.enum([
  "khaini",
  "gutka",
  "zarda",
  "mawa",
  "snuff",
  "mishri",
]);
export const quidSiteEnum = z.enum([
  "left_buccal",
  "right_buccal",
  "lower_lip",
  "upper_lip",
  "floor_of_mouth",
  "none",
]);
export const paanEnum = z.enum(["never", "occasional", "frequent"]);
export const alcoholEnum = z.enum(["never", "occasional", "daily"]);

// ----- symptoms -----
export const lesionDurationEnum = z.enum([
  "lt_2wk",
  "2wk_1mo",
  "1_3mo",
  "gt_3mo",
]);

// ----- exam -----
export const subsiteEnum = z.enum([
  "lip",
  "labial_mucosa",
  "buccal_mucosa",
  "retromolar",
  "gingiva",
  "tongue_dorsum",
  "tongue_lateral",
  "tongue_ventral",
  "floor_of_mouth",
  "hard_palate",
  "soft_palate",
  "oropharynx",
]);
export const lesionTypeEnum = z.enum([
  "ulcer",
  "white_patch",
  "red_patch",
  "mixed_patch",
  "growth_mass",
  "blanching_fibrosis",
  "none",
]);
export const surfaceEnum = z.enum([
  "smooth",
  "ulcerated",
  "nodular",
  "verrucous",
]);

export const oralRiskFactorsSchema = z.object({
  smokedStatus: habitStatusEnum.default("never"),
  smokedType: z.array(smokedTypeEnum).default([]),
  smokedPerDay: z.coerce.number().int().min(0).max(100).optional(),
  // Duration value is in `smokedUseUnit` (years by default, or months for
  // short-term users). All habit-detail fields are optional/informational.
  smokedYears: z.coerce.number().int().min(0).max(600).optional(),
  smokedUseUnit: z.enum(["years", "months"]).optional(),
  smokelessStatus: habitStatusEnum.default("never"),
  smokelessType: z.array(smokelessTypeEnum).default([]),
  smokelessPerDay: z.coerce.number().int().min(0).max(100).optional(),
  smokelessYears: z.coerce.number().int().min(0).max(600).optional(),
  smokelessUseUnit: z.enum(["years", "months"]).optional(),
  quidSite: quidSiteEnum.optional(),
  paan: paanEnum.default("never"),
  paanTobaccoAdded: z.boolean().default(false),
  alcohol: alcoholEnum.default("never"),
  familyHistory: z.boolean().default(false),
  chronicTrauma: z.boolean().default(false),
});

export const oralSymptomsSchema = z
  .object({
    nonHealingLesion: z.boolean().default(false),
    lesionDuration: lesionDurationEnum.optional(),
    whitePatch: z.boolean().default(false),
    redPatch: z.boolean().default(false),
    mixedPatch: z.boolean().default(false),
    lump: z.boolean().default(false),
    difficultyOpening: z.boolean().default(false),
    mouthOpeningMm: z.coerce.number().int().min(0).max(60).optional(),
    painSwallowing: z.boolean().default(false),
    burningSpicy: z.boolean().default(false),
    numbness: z.boolean().default(false),
    looseTeeth: z.boolean().default(false),
    neckSwelling: z.boolean().default(false),
    voiceChange: z.boolean().default(false),
    bleeding: z.boolean().default(false),
  })
  // Duration is the threshold that promotes a lesion to a RED flag, so it is
  // mandatory once a non-healing lesion is reported.
  .refine((s) => !s.nonHealingLesion || s.lesionDuration != null, {
    message: "Lesion duration is required when a non-healing lesion is reported",
    path: ["lesionDuration"],
  })
  // Mouth-opening mm is needed to grade trismus once difficulty is reported.
  .refine((s) => !s.difficultyOpening || s.mouthOpeningMm != null, {
    message: "Mouth opening (mm) is required when difficulty opening is reported",
    path: ["mouthOpeningMm"],
  });

export const oralLesionSchema = z.object({
  subsite: subsiteEnum,
  lesionType: lesionTypeEnum,
  sizeMm: z.coerce.number().int().min(0).max(120).optional(),
  induration: z.boolean().default(false),
  surface: surfaceEnum.optional(),
});

export const oralQuestionnaireSchema = z.object({
  // Consent gate — must be true before any screening is finalized.
  consent: z.boolean(),
  campId: z.string().max(120).optional(),
  abha: z
    .string()
    .optional()
    .refine((v) => !v || /^\d{14}$/.test(v), "ABHA must be 14 digits"),
  riskFactors: oralRiskFactorsSchema,
  symptoms: oralSymptomsSchema,
  lesions: z.array(oralLesionSchema).max(20).default([]),
});

// Payloads -----------------------------------------------------------------
export const screeningCreateSchema = z.object({
  patientId: z.string().min(1),
  pathway: pathwayEnum.default("oral"),
  screeningDate: z.string().min(1).max(32),
  questionnaire: oralQuestionnaireSchema,
});

export const screeningReviewSchema = z.object({
  reviewStatus: z.enum(["reviewed", "referred", "cleared"]),
  doctorNotes: z.string().max(5000).optional(),
  // Optional referral payload — interval for "review again", and the generated
  // referral note text. Stored as JSON in screenings.referral.
  reviewIntervalDays: z.coerce.number().int().min(1).max(365).optional(),
  referralNote: z.string().max(5000).optional(),
});

// The guided oral capture view set (7 required + 2 conditional). Mirrors
// docs/oral-screening-spec.v1.json image_capture.
export const oralImageViewEnum = z.enum([
  "anterior_open",
  "buccal_right",
  "buccal_left",
  "tongue_dorsum",
  "tongue_lateral",
  "ventral_floor",
  "palate",
  "lesion_closeup",
  "quid_site_closeup",
]);

export const screeningOutcomeEnum = z.enum([
  "referred_biopsy_pending",
  "biopsy_benign",
  "biopsy_dysplasia",
  "biopsy_oscc_cancer",
  "not_biopsied",
  "lost_to_followup",
]);

export const screeningOutcomeSchema = z.object({
  outcome: screeningOutcomeEnum,
  outcomeNotes: z.string().max(2000).optional(),
  outcomeDate: z.string().max(32).optional(),
});

// A blank, schema-valid oral questionnaire — used to seed a draft screening
// row (which exists mainly to anchor photo uploads before the MA submits).
export function emptyOralQuestionnaire() {
  return oralQuestionnaireSchema.parse({
    consent: false,
    riskFactors: {},
    symptoms: {},
    lesions: [],
  });
}

// Inferred types — the engine's input contract -----------------------------
export type OralRiskFactors = z.infer<typeof oralRiskFactorsSchema>;
export type OralSymptoms = z.infer<typeof oralSymptomsSchema>;
export type OralLesion = z.infer<typeof oralLesionSchema>;
export type OralQuestionnaire = z.infer<typeof oralQuestionnaireSchema>;
export type ScreeningCreateInput = z.infer<typeof screeningCreateSchema>;
export type ScreeningOutcome = z.infer<typeof screeningOutcomeEnum>;
