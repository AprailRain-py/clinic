// ---------------------------------------------------------------------------
// Oral screening triage ruleset (v1).
//
// This is the DOCTOR-EDITABLE configuration that drives the triage colour. The
// engine (./engine.ts) holds the predicate logic keyed by factor id; this file
// holds the knobs a clinician is allowed to tune: enable/disable a factor, its
// tier (RED/AMBER/YELLOW), its display reason, its point contribution, and the
// global thresholds + band cut-offs.
//
// Design intent (see docs/ai-cancer-screening-research-and-plan.md §C):
//   - Layer 1 (override): the highest TIER that fires sets a floor on the band
//     — any RED -> High, any AMBER -> at least Moderate. Clinical red flags can
//     never be under-classified by the points.
//   - Layer 2 (points): an additive score ranks cases within a band and decides
//     the band when no tier-bearing factor fires.
//   - tier: null factors are score-only MODIFIERS (habits, age, duration) — they
//     add points and show as context, but do not raise the override floor.
//
// CLINICAL CONTENT IS v1 DRAFT — the reviewing oncologist ratifies the tiers,
// points and thresholds before any real clinical use. Numbers are provisional
// engineering defaults to be tuned against biopsy outcomes via the feedback
// loop; the SAFETY rests on the tier overrides, not the exact point values.
// ---------------------------------------------------------------------------

export type Tier = "RED" | "AMBER" | "YELLOW" | "GREEN";
export type Band = "low" | "moderate" | "high";

export interface FactorConfig {
  /** Stable id; must have a matching predicate in engine.ts PREDICATES. */
  id: string;
  enabled: boolean;
  /** null = score-only modifier (no override floor). */
  tier: Tier | null;
  /** Human-readable reason shown to the doctor when this factor fires. */
  reason: string;
  /** Points added to the score when this factor fires. */
  points: number;
}

export interface OralRulesetParams {
  /** Interincisal opening below this (mm) flags reduced opening / OSMF. */
  trismusFlagMm: number;
  /** Interincisal opening below this (mm) is severe trismus. */
  trismusSevereMm: number;
  /** Cigarettes/bidis per day at or above this counts as heavy smoking. */
  heavySmokingPerDay: number;
  /** Score thresholds for the band (override floor can only raise these). */
  bandCutoffs: { high: number; moderate: number };
}

export interface OralRuleset {
  version: string;
  params: OralRulesetParams;
  factors: FactorConfig[];
}

export const ORAL_RULESET_V1: OralRuleset = {
  version: "oral-1.0.0",
  params: {
    trismusFlagMm: 35,
    trismusSevereMm: 20,
    heavySmokingPerDay: 10,
    bandCutoffs: { high: 40, moderate: 20 },
  },
  factors: [
    // ---- RED: suspect malignancy -> High, refer for biopsy ----
    { id: "RED_erythroplakia", enabled: true, tier: "RED", reason: "Red patch (erythroplakia)", points: 50 },
    { id: "RED_speckled", enabled: true, tier: "RED", reason: "Mixed / speckled lesion", points: 45 },
    { id: "RED_nonhealing_2wk", enabled: true, tier: "RED", reason: "Non-healing lesion ≥ 2 weeks", points: 40 },
    { id: "RED_mass_induration", enabled: true, tier: "RED", reason: "Mass / induration / fixity", points: 40 },
    { id: "RED_neck_node", enabled: true, tier: "RED", reason: "Palpable neck node", points: 30 },
    { id: "RED_highrisk_subsite", enabled: true, tier: "RED", reason: "Abnormal lesion on high-risk subsite", points: 30 },
    { id: "RED_bleeding", enabled: true, tier: "RED", reason: "Lesion bleeds", points: 20 },
    { id: "RED_numbness", enabled: true, tier: "RED", reason: "Numbness of lip/tongue/cheek", points: 20 },
    { id: "RED_loose_teeth", enabled: true, tier: "RED", reason: "Loose teeth (no dental cause)", points: 20 },

    // ---- AMBER: potentially malignant disorder -> at least Moderate ----
    { id: "AMBER_severe_trismus", enabled: true, tier: "AMBER", reason: "Severe trismus (< 20 mm) — expedite", points: 25 },
    { id: "AMBER_leukoplakia", enabled: true, tier: "AMBER", reason: "Leukoplakia (white patch)", points: 25 },
    { id: "AMBER_osmf", enabled: true, tier: "AMBER", reason: "OSMF signs (blanching / burning / trismus 20–35 mm)", points: 15 },
    { id: "AMBER_white_in_user", enabled: true, tier: "AMBER", reason: "White patch in tobacco/areca user", points: 10 },

    // ---- YELLOW: risk-factor surveillance (no lesion) -> Low, counsel ----
    { id: "YELLOW_habit_no_lesion", enabled: true, tier: "YELLOW", reason: "High-risk habit, no current lesion", points: 0 },

    // ---- score-only modifiers (tier null) ----
    { id: "MOD_duration_gt3mo", enabled: true, tier: null, reason: "Lesion duration > 3 months", points: 15 },
    { id: "MOD_duration_1_3mo", enabled: true, tier: null, reason: "Lesion duration 1–3 months", points: 10 },
    { id: "MOD_duration_2wk_1mo", enabled: true, tier: null, reason: "Lesion duration 2 weeks–1 month", points: 5 },
    { id: "MOD_smokeless_current", enabled: true, tier: null, reason: "Current smokeless tobacco / areca", points: 15 },
    { id: "MOD_smokeless_past", enabled: true, tier: null, reason: "Past smokeless tobacco / areca", points: 7 },
    { id: "MOD_smoked_current", enabled: true, tier: null, reason: "Current smoker", points: 10 },
    { id: "MOD_alcohol_daily", enabled: true, tier: null, reason: "Daily alcohol", points: 5 },
    { id: "MOD_age_50", enabled: true, tier: null, reason: "Age ≥ 50", points: 10 },
    { id: "MOD_age_40_49", enabled: true, tier: null, reason: "Age 40–49", points: 5 },
    { id: "MOD_family_history", enabled: true, tier: null, reason: "Family history of head & neck cancer", points: 5 },
  ],
};
