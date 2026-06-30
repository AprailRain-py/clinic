// Public entry point for the oral screening triage engine.

import type { OralQuestionnaire } from "../validators/screening";
import { evaluateOral, type OralEvalResult } from "./engine";

/**
 * Run the triage engine for a finalized oral questionnaire. Age comes from the
 * patient record (it is not part of the questionnaire JSON).
 */
export function runOralTriage(
  age: number,
  q: OralQuestionnaire,
): OralEvalResult {
  return evaluateOral({
    age,
    riskFactors: q.riskFactors,
    symptoms: q.symptoms,
    lesions: q.lesions,
  });
}

export { evaluateOral } from "./engine";
export type { OralEvalInput, OralEvalResult, FiredFactor } from "./engine";
export { ORAL_RULESET_V1 } from "./oral-ruleset";
export type { Band, Tier, OralRuleset, FactorConfig } from "./oral-ruleset";
