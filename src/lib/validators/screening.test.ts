import assert from "node:assert/strict";
import { test } from "node:test";

import {
  emptyOralQuestionnaire,
  oralImageViewEnum,
  oralLesionSchema,
  oralQuestionnaireSchema,
  oralRiskFactorsSchema,
  oralSymptomsSchema,
  screeningCreateSchema,
  screeningOutcomeSchema,
  screeningReviewSchema,
} from "./screening";

test("risk factors apply sensible defaults from {}", () => {
  const rf = oralRiskFactorsSchema.parse({});
  assert.equal(rf.smokedStatus, "never");
  assert.equal(rf.smokelessStatus, "never");
  assert.equal(rf.paan, "never");
  assert.equal(rf.alcohol, "never");
  assert.deepEqual(rf.smokedType, []);
  assert.equal(rf.familyHistory, false);
});

test("symptoms: non-healing lesion requires a duration", () => {
  assert.equal(
    oralSymptomsSchema.safeParse({ nonHealingLesion: true }).success,
    false,
  );
  assert.equal(
    oralSymptomsSchema.safeParse({
      nonHealingLesion: true,
      lesionDuration: "1_3mo",
    }).success,
    true,
  );
});

test("symptoms: difficulty opening requires mouth-opening mm", () => {
  assert.equal(
    oralSymptomsSchema.safeParse({ difficultyOpening: true }).success,
    false,
  );
  assert.equal(
    oralSymptomsSchema.safeParse({
      difficultyOpening: true,
      mouthOpeningMm: 28,
    }).success,
    true,
  );
});

test("ABHA must be 14 digits when present, optional when blank", () => {
  const base = { consent: true, riskFactors: {}, symptoms: {}, lesions: [] };
  assert.equal(
    oralQuestionnaireSchema.safeParse({ ...base, abha: "12345678901234" })
      .success,
    true,
  );
  assert.equal(
    oralQuestionnaireSchema.safeParse({ ...base, abha: "123" }).success,
    false,
  );
  assert.equal(oralQuestionnaireSchema.safeParse(base).success, true);
});

test("emptyOralQuestionnaire() is schema-valid and unconsented", () => {
  const q = emptyOralQuestionnaire();
  assert.equal(q.consent, false);
  assert.deepEqual(q.lesions, []);
  assert.equal(oralQuestionnaireSchema.safeParse(q).success, true);
});

test("lesion schema accepts a full lesion and coerces size", () => {
  const parsed = oralLesionSchema.parse({
    subsite: "tongue_lateral",
    lesionType: "ulcer",
    sizeMm: "8",
    induration: true,
    surface: "ulcerated",
  });
  assert.equal(parsed.sizeMm, 8);
  assert.equal(parsed.subsite, "tongue_lateral");
});

test("screeningCreateSchema defaults pathway to oral", () => {
  const parsed = screeningCreateSchema.parse({
    patientId: "p1",
    screeningDate: "2026-06-29",
    questionnaire: { consent: true, riskFactors: {}, symptoms: {}, lesions: [] },
  });
  assert.equal(parsed.pathway, "oral");
});

test("screeningReviewSchema validates status + coerces interval", () => {
  const ok = screeningReviewSchema.safeParse({
    reviewStatus: "referred",
    reviewIntervalDays: "14",
  });
  assert.equal(ok.success, true);
  assert.equal(ok.success && ok.data.reviewIntervalDays, 14);
  assert.equal(
    screeningReviewSchema.safeParse({ reviewStatus: "nope" }).success,
    false,
  );
});

test("screeningOutcomeSchema accepts known outcomes only", () => {
  assert.equal(
    screeningOutcomeSchema.safeParse({ outcome: "biopsy_oscc_cancer" }).success,
    true,
  );
  assert.equal(
    screeningOutcomeSchema.safeParse({ outcome: "made_up" }).success,
    false,
  );
});

test("oralImageViewEnum guards the guided view set", () => {
  assert.equal(oralImageViewEnum.safeParse("tongue_lateral").success, true);
  assert.equal(oralImageViewEnum.safeParse("quid_site_closeup").success, true);
  assert.equal(oralImageViewEnum.safeParse("selfie").success, false);
});
