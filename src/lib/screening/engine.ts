// ---------------------------------------------------------------------------
// Oral screening triage engine.
//
// Deterministic, transparent, rule-based — NOT machine learning. Given the
// validated questionnaire answers it returns a triage band (low/moderate/high),
// a headline tier (RED/AMBER/YELLOW/GREEN), an explainable list of the factors
// that fired, and a numeric score. Every colour the doctor sees is traceable to
// the reasons here — nothing is a black box, and the AI image model (later, in
// shadow mode) only ADDS a signal; it never overrides these rules.
//
// See ./oral-ruleset.ts for the doctor-editable config and the design rationale.
// ---------------------------------------------------------------------------

import type {
  OralLesion,
  OralRiskFactors,
  OralSymptoms,
} from "../validators/screening";
import {
  ORAL_RULESET_V1,
  type Band,
  type OralRuleset,
  type OralRulesetParams,
  type Tier,
} from "./oral-ruleset";

export interface OralEvalInput {
  /** Patient age in years (lives on the patient record, not the questionnaire). */
  age: number;
  riskFactors: OralRiskFactors;
  symptoms: OralSymptoms;
  lesions: OralLesion[];
}

export interface FiredFactor {
  id: string;
  tier: Tier | null;
  reason: string;
  points: number;
}

export interface OralEvalResult {
  band: Band;
  /** Highest tier that fired (the headline category); GREEN if none. */
  tier: Tier;
  score: number;
  /** Tier-bearing reasons first, then score-only modifiers — display order. */
  firedReasons: FiredFactor[];
  rulesetVersion: string;
}

const HIGH_RISK_SUBSITES = new Set<OralLesion["subsite"]>([
  "tongue_lateral",
  "tongue_ventral",
  "floor_of_mouth",
]);

// True when the encounter records any actual lesion (exam or symptom). Used by
// the YELLOW "habit but no lesion" surveillance rule.
function hasAnyLesion(i: OralEvalInput): boolean {
  const examLesion = i.lesions.some((l) => l.lesionType !== "none");
  const s = i.symptoms;
  return (
    examLesion ||
    s.nonHealingLesion ||
    s.whitePatch ||
    s.redPatch ||
    s.mixedPatch ||
    s.lump
  );
}

function isHighRiskHabit(rf: OralRiskFactors, p: OralRulesetParams): boolean {
  return (
    rf.smokelessStatus === "current" ||
    rf.paan === "frequent" ||
    rf.alcohol === "daily" ||
    (rf.smokedStatus === "current" && (rf.smokedPerDay ?? 0) >= p.heavySmokingPerDay)
  );
}

// Predicate per factor id. Each returns true when that factor is present.
const PREDICATES: Record<
  string,
  (i: OralEvalInput, p: OralRulesetParams) => boolean
> = {
  // ---- RED ----
  RED_erythroplakia: (i) =>
    i.symptoms.redPatch || i.lesions.some((l) => l.lesionType === "red_patch"),
  RED_speckled: (i) =>
    i.symptoms.mixedPatch ||
    i.lesions.some((l) => l.lesionType === "mixed_patch"),
  RED_nonhealing_2wk: (i) =>
    i.symptoms.nonHealingLesion &&
    i.symptoms.lesionDuration != null &&
    i.symptoms.lesionDuration !== "lt_2wk",
  RED_mass_induration: (i) =>
    i.symptoms.lump ||
    i.lesions.some((l) => l.induration || l.lesionType === "growth_mass"),
  RED_neck_node: (i) => i.symptoms.neckSwelling,
  RED_highrisk_subsite: (i) =>
    i.lesions.some(
      (l) => HIGH_RISK_SUBSITES.has(l.subsite) && l.lesionType !== "none",
    ),
  RED_bleeding: (i) => i.symptoms.bleeding,
  RED_numbness: (i) => i.symptoms.numbness,
  RED_loose_teeth: (i) => i.symptoms.looseTeeth,

  // ---- AMBER ----
  AMBER_severe_trismus: (i, p) =>
    i.symptoms.mouthOpeningMm != null &&
    i.symptoms.mouthOpeningMm < p.trismusSevereMm,
  AMBER_leukoplakia: (i) =>
    i.symptoms.whitePatch ||
    i.lesions.some((l) => l.lesionType === "white_patch"),
  AMBER_osmf: (i, p) =>
    i.lesions.some((l) => l.lesionType === "blanching_fibrosis") ||
    i.symptoms.burningSpicy ||
    (i.symptoms.mouthOpeningMm != null &&
      i.symptoms.mouthOpeningMm >= p.trismusSevereMm &&
      i.symptoms.mouthOpeningMm < p.trismusFlagMm),
  AMBER_white_in_user: (i) =>
    i.symptoms.whitePatch &&
    (i.riskFactors.smokelessStatus === "current" ||
      i.riskFactors.paan !== "never"),

  // ---- YELLOW ----
  YELLOW_habit_no_lesion: (i, p) =>
    isHighRiskHabit(i.riskFactors, p) && !hasAnyLesion(i),

  // ---- score-only modifiers ----
  MOD_duration_gt3mo: (i) => i.symptoms.lesionDuration === "gt_3mo",
  MOD_duration_1_3mo: (i) => i.symptoms.lesionDuration === "1_3mo",
  MOD_duration_2wk_1mo: (i) => i.symptoms.lesionDuration === "2wk_1mo",
  MOD_smokeless_current: (i) => i.riskFactors.smokelessStatus === "current",
  MOD_smokeless_past: (i) => i.riskFactors.smokelessStatus === "past",
  MOD_smoked_current: (i) => i.riskFactors.smokedStatus === "current",
  MOD_alcohol_daily: (i) => i.riskFactors.alcohol === "daily",
  MOD_age_50: (i) => i.age >= 50,
  MOD_age_40_49: (i) => i.age >= 40 && i.age < 50,
  MOD_family_history: (i) => i.riskFactors.familyHistory,
};

const TIER_BAND: Record<Tier, Band> = {
  RED: "high",
  AMBER: "moderate",
  YELLOW: "low",
  GREEN: "low",
};
const TIER_RANK: Record<Tier, number> = { GREEN: 0, YELLOW: 1, AMBER: 2, RED: 3 };
const BAND_RANK: Record<Band, number> = { low: 0, moderate: 1, high: 2 };

function pointsBand(score: number, p: OralRulesetParams): Band {
  if (score >= p.bandCutoffs.high) return "high";
  if (score >= p.bandCutoffs.moderate) return "moderate";
  return "low";
}

function moreSevereBand(a: Band, b: Band): Band {
  return BAND_RANK[a] >= BAND_RANK[b] ? a : b;
}

/**
 * Evaluate an oral screening. Pure function — same input always yields the same
 * result. Pass a custom ruleset (e.g. a doctor-edited version) to override the
 * v1 defaults; the result records which ruleset version produced it.
 */
export function evaluateOral(
  input: OralEvalInput,
  ruleset: OralRuleset = ORAL_RULESET_V1,
): OralEvalResult {
  const { params } = ruleset;
  const fired: FiredFactor[] = [];
  let score = 0;
  let topTier: Tier = "GREEN";

  for (const factor of ruleset.factors) {
    if (!factor.enabled) continue;
    const predicate = PREDICATES[factor.id];
    if (!predicate) continue; // config references an unknown factor — skip safely
    if (!predicate(input, params)) continue;

    fired.push({
      id: factor.id,
      tier: factor.tier,
      reason: factor.reason,
      points: factor.points,
    });
    score += factor.points;
    if (factor.tier && TIER_RANK[factor.tier] > TIER_RANK[topTier]) {
      topTier = factor.tier;
    }
  }

  // Band = the more severe of (override floor from the top tier, points band).
  const band = moreSevereBand(TIER_BAND[topTier], pointsBand(score, params));

  // Display order: tier-bearing reasons (most severe first), then modifiers.
  fired.sort((a, b) => {
    const ta = a.tier ? TIER_RANK[a.tier] : -1;
    const tb = b.tier ? TIER_RANK[b.tier] : -1;
    if (ta !== tb) return tb - ta;
    return b.points - a.points;
  });

  return {
    band,
    tier: topTier,
    score,
    firedReasons: fired,
    rulesetVersion: ruleset.version,
  };
}

// Re-export config helpers so callers can import from one place.
export { ORAL_RULESET_V1 } from "./oral-ruleset";
export type { Band, Tier, FactorConfig, OralRuleset } from "./oral-ruleset";
