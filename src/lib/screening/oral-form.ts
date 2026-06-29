// Display metadata for the oral screening forms (labels, options, capture
// views). The triage logic lives in the engine; this is presentation only.
// label_hi is intentionally omitted for now — Hindi must be clinician-validated
// (Phase 2), never machine-translated.

export type Opt = { value: string; label: string };

export const SEX_OPTIONS: Opt[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

export const HABIT_STATUS_OPTIONS: Opt[] = [
  { value: "never", label: "Never" },
  { value: "past", label: "Past" },
  { value: "current", label: "Current" },
];

export const SMOKED_TYPE_OPTIONS: Opt[] = [
  { value: "bidi", label: "Bidi" },
  { value: "cigarette", label: "Cigarette" },
  { value: "hookah", label: "Hookah" },
  { value: "reverse_smoking", label: "Reverse smoking" },
];

export const SMOKELESS_TYPE_OPTIONS: Opt[] = [
  { value: "khaini", label: "Khaini" },
  { value: "gutka", label: "Gutka" },
  { value: "zarda", label: "Zarda" },
  { value: "mawa", label: "Mawa" },
  { value: "snuff", label: "Snuff" },
  { value: "mishri", label: "Mishri" },
];

export const QUID_SITE_OPTIONS: Opt[] = [
  { value: "left_buccal", label: "Left cheek" },
  { value: "right_buccal", label: "Right cheek" },
  { value: "lower_lip", label: "Lower lip" },
  { value: "upper_lip", label: "Upper lip" },
  { value: "floor_of_mouth", label: "Floor of mouth" },
  { value: "none", label: "None" },
];

export const PAAN_OPTIONS: Opt[] = [
  { value: "never", label: "Never" },
  { value: "occasional", label: "Occasional" },
  { value: "frequent", label: "Frequent" },
];

export const ALCOHOL_OPTIONS: Opt[] = [
  { value: "never", label: "Never" },
  { value: "occasional", label: "Occasional" },
  { value: "daily", label: "Daily" },
];

export const LESION_DURATION_OPTIONS: Opt[] = [
  { value: "lt_2wk", label: "< 2 wks" },
  { value: "2wk_1mo", label: "2–4 wks" },
  { value: "1_3mo", label: "1–3 mo" },
  { value: "gt_3mo", label: "> 3 mo" },
];

// Boolean symptom toggle list. `needsDuration` reveals the lesion-duration
// chips; `needsMm` reveals the mouth-opening input.
export type SymptomItem = {
  key: string;
  label: string;
  needsDuration?: boolean;
  needsMm?: boolean;
};

export const SYMPTOM_ITEMS: SymptomItem[] = [
  { key: "nonHealingLesion", label: "Non-healing ulcer / patch / growth", needsDuration: true },
  { key: "redPatch", label: "Red patch" },
  { key: "whitePatch", label: "White patch" },
  { key: "mixedPatch", label: "Mixed red-white / speckled patch" },
  { key: "lump", label: "Lump / mass / growth" },
  { key: "difficultyOpening", label: "Difficulty opening mouth", needsMm: true },
  { key: "painSwallowing", label: "Pain / difficulty swallowing" },
  { key: "burningSpicy", label: "Burning on spicy food" },
  { key: "numbness", label: "Numbness of lip / tongue / cheek" },
  { key: "looseTeeth", label: "Loose teeth (no dental cause)" },
  { key: "neckSwelling", label: "Neck swelling / lump" },
  { key: "voiceChange", label: "Voice change" },
  { key: "bleeding", label: "Lesion bleeds" },
];

// Exam (per-lesion) option sets.
export const SUBSITE_OPTIONS: Opt[] = [
  { value: "lip", label: "Lip" },
  { value: "labial_mucosa", label: "Labial mucosa" },
  { value: "buccal_mucosa", label: "Buccal mucosa" },
  { value: "retromolar", label: "Retromolar" },
  { value: "gingiva", label: "Gingiva" },
  { value: "tongue_dorsum", label: "Tongue dorsum" },
  { value: "tongue_lateral", label: "Tongue lateral border" },
  { value: "tongue_ventral", label: "Tongue ventral" },
  { value: "floor_of_mouth", label: "Floor of mouth" },
  { value: "hard_palate", label: "Hard palate" },
  { value: "soft_palate", label: "Soft palate" },
  { value: "oropharynx", label: "Oropharynx" },
];

export const LESION_TYPE_OPTIONS: Opt[] = [
  { value: "ulcer", label: "Ulcer" },
  { value: "white_patch", label: "White patch" },
  { value: "red_patch", label: "Red patch" },
  { value: "mixed_patch", label: "Mixed / speckled" },
  { value: "growth_mass", label: "Growth / mass" },
  { value: "blanching_fibrosis", label: "Blanching / fibrosis" },
  { value: "none", label: "No lesion" },
];

export const SURFACE_OPTIONS: Opt[] = [
  { value: "smooth", label: "Smooth" },
  { value: "ulcerated", label: "Ulcerated" },
  { value: "nodular", label: "Nodular" },
  { value: "verrucous", label: "Verrucous" },
];

// Guided capture views (7 required + 2 conditional). ids match
// oralImageViewEnum / the API.
export type CaptureView = {
  id: string;
  label: string;
  hint: string;
  conditional?: "lesion" | "quid";
};

export const ORAL_VIEWS: CaptureView[] = [
  { id: "anterior_open", label: "Lips & anterior, mouth open", hint: "Relax lips, open wide, even light." },
  { id: "buccal_right", label: "Right cheek (buccal mucosa)", hint: "Retract the right cheek with a spatula." },
  { id: "buccal_left", label: "Left cheek (buccal mucosa)", hint: "Retract the left cheek with a spatula." },
  { id: "tongue_dorsum", label: "Tongue — top (dorsum)", hint: "Ask patient to stick the tongue straight out." },
  { id: "tongue_lateral", label: "Tongue — side borders", hint: "Hold the tip with gauze; show both sides." },
  { id: "ventral_floor", label: "Under tongue & floor of mouth", hint: "Lift the tongue to the palate." },
  { id: "palate", label: "Hard & soft palate", hint: "Tilt the head back; say 'aah'." },
];

export const CONDITIONAL_VIEWS: CaptureView[] = [
  { id: "lesion_closeup", label: "Lesion close-up", hint: "Fill the frame with the lesion + a ruler/scale.", conditional: "lesion" },
  { id: "quid_site_closeup", label: "Quid-parking site", hint: "Photograph the quid site even if it looks normal.", conditional: "quid" },
];
