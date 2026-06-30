import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  OralLesion,
  OralRiskFactors,
  OralSymptoms,
} from "../validators/screening";
import { evaluateOral, type OralEvalInput } from "./engine";

// ---- baseline builders (a healthy, no-risk encounter) ----
function riskFactors(over: Partial<OralRiskFactors> = {}): OralRiskFactors {
  return {
    smokedStatus: "never",
    smokedType: [],
    smokelessStatus: "never",
    smokelessType: [],
    paan: "never",
    paanTobaccoAdded: false,
    alcohol: "never",
    familyHistory: false,
    chronicTrauma: false,
    ...over,
  };
}

function symptoms(over: Partial<OralSymptoms> = {}): OralSymptoms {
  return {
    nonHealingLesion: false,
    whitePatch: false,
    redPatch: false,
    mixedPatch: false,
    lump: false,
    difficultyOpening: false,
    painSwallowing: false,
    burningSpicy: false,
    numbness: false,
    looseTeeth: false,
    neckSwelling: false,
    voiceChange: false,
    bleeding: false,
    ...over,
  };
}

function input(over: Partial<OralEvalInput> = {}): OralEvalInput {
  return {
    age: 30,
    riskFactors: riskFactors(),
    symptoms: symptoms(),
    lesions: [],
    ...over,
  };
}

const lesion = (over: Partial<OralLesion>): OralLesion => ({
  subsite: "buccal_mucosa",
  lesionType: "none",
  induration: false,
  ...over,
});

const fired = (r: ReturnType<typeof evaluateOral>) =>
  r.firedReasons.map((f) => f.id);

test("normal encounter → low / GREEN / score 0", () => {
  const r = evaluateOral(input());
  assert.equal(r.band, "low");
  assert.equal(r.tier, "GREEN");
  assert.equal(r.score, 0);
  assert.deepEqual(r.firedReasons, []);
});

test("red patch → high / RED", () => {
  const r = evaluateOral(input({ symptoms: symptoms({ redPatch: true }) }));
  assert.equal(r.band, "high");
  assert.equal(r.tier, "RED");
  assert.ok(fired(r).includes("RED_erythroplakia"));
});

test("RED override beats a low points band (bleeding only)", () => {
  // bleeding = RED, +20 → points alone would be 'moderate', RED floor → high.
  const r = evaluateOral(input({ symptoms: symptoms({ bleeding: true }) }));
  assert.equal(r.score, 20);
  assert.equal(r.tier, "RED");
  assert.equal(r.band, "high");
});

test("AMBER override lifts a sub-threshold score to moderate (trismus 30 mm)", () => {
  // OSMF amber +15 → points band 'low' (<20), AMBER floor → moderate.
  const r = evaluateOral(
    input({ symptoms: symptoms({ difficultyOpening: true, mouthOpeningMm: 30 }) }),
  );
  assert.equal(r.score, 15);
  assert.equal(r.tier, "AMBER");
  assert.equal(r.band, "moderate");
  assert.ok(fired(r).includes("AMBER_osmf"));
});

test("severe trismus (<20 mm) fires AMBER_severe_trismus", () => {
  const r = evaluateOral(
    input({ symptoms: symptoms({ difficultyOpening: true, mouthOpeningMm: 12 }) }),
  );
  assert.ok(fired(r).includes("AMBER_severe_trismus"));
  assert.equal(r.tier, "AMBER");
});

test("white patch in a smokeless user → AMBER, points can reach high", () => {
  const r = evaluateOral(
    input({
      riskFactors: riskFactors({ smokelessStatus: "current" }),
      symptoms: symptoms({ whitePatch: true }),
    }),
  );
  const ids = fired(r);
  assert.ok(ids.includes("AMBER_leukoplakia")); // +25
  assert.ok(ids.includes("AMBER_white_in_user")); // +10
  assert.ok(ids.includes("MOD_smokeless_current")); // +15
  assert.equal(r.score, 50);
  assert.equal(r.tier, "AMBER");
  assert.equal(r.band, "high"); // points push it past 40
});

test("high-risk habit, no lesion → YELLOW / low (surveillance)", () => {
  const r = evaluateOral(
    input({ riskFactors: riskFactors({ smokelessStatus: "current" }) }),
  );
  assert.equal(r.tier, "YELLOW");
  assert.equal(r.band, "low");
  assert.ok(fired(r).includes("YELLOW_habit_no_lesion"));
});

test("YELLOW surveillance does NOT fire once a lesion is present", () => {
  const r = evaluateOral(
    input({
      riskFactors: riskFactors({ smokelessStatus: "current" }),
      symptoms: symptoms({ whitePatch: true }),
    }),
  );
  assert.ok(!fired(r).includes("YELLOW_habit_no_lesion"));
});

test("persistent ulcer + habit + age accumulate to high / RED", () => {
  const r = evaluateOral(
    input({
      age: 55,
      riskFactors: riskFactors({ smokelessStatus: "current" }),
      symptoms: symptoms({ nonHealingLesion: true, lesionDuration: "gt_3mo" }),
    }),
  );
  const ids = fired(r);
  assert.ok(ids.includes("RED_nonhealing_2wk")); // +40
  assert.ok(ids.includes("MOD_duration_gt3mo")); // +15
  assert.ok(ids.includes("MOD_smokeless_current")); // +15
  assert.ok(ids.includes("MOD_age_50")); // +10
  assert.equal(r.score, 80);
  assert.equal(r.band, "high");
  assert.equal(r.tier, "RED");
});

test("non-healing ulcer under 2 weeks does NOT fire the RED flag", () => {
  const r = evaluateOral(
    input({ symptoms: symptoms({ nonHealingLesion: true, lesionDuration: "lt_2wk" }) }),
  );
  assert.ok(!fired(r).includes("RED_nonhealing_2wk"));
});

test("abnormal lesion on a high-risk subsite fires RED_highrisk_subsite", () => {
  const r = evaluateOral(
    input({ lesions: [lesion({ subsite: "tongue_lateral", lesionType: "ulcer" })] }),
  );
  assert.ok(fired(r).includes("RED_highrisk_subsite"));
  assert.equal(r.tier, "RED");
});

test("firedReasons are sorted tier-first (RED before modifiers)", () => {
  const r = evaluateOral(
    input({
      age: 55,
      riskFactors: riskFactors({ smokelessStatus: "current" }),
      symptoms: symptoms({ redPatch: true }),
    }),
  );
  assert.equal(r.firedReasons[0].tier, "RED");
  assert.equal(r.firedReasons.at(-1)?.tier, null);
});

test("evaluation is deterministic and records the ruleset version", () => {
  const i = input({ symptoms: symptoms({ redPatch: true }) });
  const a = evaluateOral(i);
  const b = evaluateOral(i);
  assert.deepEqual(a, b);
  assert.equal(a.rulesetVersion, "oral-1.0.0");
});

test("trismus boundaries: 35 mm clears, 34 mm → OSMF, 19 mm → severe", () => {
  const at = (mm: number) =>
    fired(
      evaluateOral(
        input({ symptoms: symptoms({ difficultyOpening: true, mouthOpeningMm: mm }) }),
      ),
    );
  assert.ok(!at(35).includes("AMBER_osmf"));
  assert.ok(!at(35).includes("AMBER_severe_trismus"));
  assert.ok(at(34).includes("AMBER_osmf"));
  assert.ok(at(19).includes("AMBER_severe_trismus"));
});

test("paan (frequent) with no lesion triggers YELLOW surveillance", () => {
  const r = evaluateOral(
    input({ riskFactors: riskFactors({ paan: "frequent" }) }),
  );
  assert.ok(fired(r).includes("YELLOW_habit_no_lesion"));
  assert.equal(r.tier, "YELLOW");
});

test("multiple RED flags all appear in the reasons", () => {
  const r = evaluateOral(
    input({ symptoms: symptoms({ bleeding: true, neckSwelling: true }) }),
  );
  const ids = fired(r);
  assert.ok(ids.includes("RED_bleeding"));
  assert.ok(ids.includes("RED_neck_node"));
  assert.equal(r.band, "high");
});

test("a normal lesion alongside a red-patch lesion still flags RED", () => {
  const r = evaluateOral(
    input({
      lesions: [
        lesion({ subsite: "buccal_mucosa", lesionType: "none" }),
        lesion({ subsite: "tongue_lateral", lesionType: "red_patch" }),
      ],
    }),
  );
  assert.equal(r.tier, "RED");
  assert.ok(fired(r).includes("RED_erythroplakia"));
  assert.ok(fired(r).includes("RED_highrisk_subsite"));
});
