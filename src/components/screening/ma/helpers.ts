// Pure helpers for the MA oral capture flow: questionnaire seeding, the
// client-side photo quality gate, applicable-view derivation and the symptom
// "fired" mapping. No React here — safe to import anywhere.

import type { FiredFactor } from "@/lib/screening";
import {
  CONDITIONAL_VIEWS,
  ORAL_VIEWS,
  type CaptureView,
} from "@/lib/screening/oral-form";
import type { OralQuestionnaire } from "@/lib/validators/screening";
import type { QualityResult } from "./types";

/** A blank, schema-valid oral questionnaire with sensible defaults. */
export function initialQuestionnaire(): OralQuestionnaire {
  return {
    consent: false,
    riskFactors: {
      smokedStatus: "never",
      smokedType: [],
      smokelessStatus: "never",
      smokelessType: [],
      paan: "never",
      paanTobaccoAdded: false,
      alcohol: "never",
      familyHistory: false,
      chronicTrauma: false,
    },
    symptoms: {
      nonHealingLesion: false,
      redPatch: false,
      whitePatch: false,
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
    },
    lesions: [],
  };
}

/** Today as YYYY-MM-DD (local). */
export function todayISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Up-to-two-letter initials for an avatar. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** True when the encounter records any lesion (symptom or exam). */
export function lesionPresent(q: OralQuestionnaire): boolean {
  const s = q.symptoms;
  const examLesion = q.lesions.some((l) => l.lesionType !== "none");
  return (
    examLesion ||
    s.nonHealingLesion ||
    s.redPatch ||
    s.whitePatch ||
    s.mixedPatch ||
    s.lump
  );
}

/** The required guided views plus any conditional views that apply. */
export function applicableViews(q: OralQuestionnaire): CaptureView[] {
  const extra = CONDITIONAL_VIEWS.filter((v) => {
    if (v.conditional === "lesion") return lesionPresent(q);
    if (v.conditional === "quid") return q.riskFactors.smokelessStatus === "current";
    return false;
  });
  return [...ORAL_VIEWS, ...extra];
}

// Which engine factor id(s) a given symptom contributes to. Used to badge a
// symptom row "Refer" when it is currently driving a RED/AMBER reason.
export const SYMPTOM_FIRED_FACTORS: Record<string, string[]> = {
  nonHealingLesion: ["RED_nonhealing_2wk"],
  redPatch: ["RED_erythroplakia"],
  whitePatch: ["AMBER_leukoplakia", "AMBER_white_in_user"],
  mixedPatch: ["RED_speckled"],
  lump: ["RED_mass_induration"],
  difficultyOpening: ["AMBER_severe_trismus", "AMBER_osmf"],
  burningSpicy: ["AMBER_osmf"],
  numbness: ["RED_numbness"],
  looseTeeth: ["RED_loose_teeth"],
  neckSwelling: ["RED_neck_node"],
  bleeding: ["RED_bleeding"],
};

/** True when this symptom is currently driving a RED/AMBER fired reason. */
export function isSymptomFired(key: string, fired: FiredFactor[]): boolean {
  const ids = SYMPTOM_FIRED_FACTORS[key];
  if (!ids || ids.length === 0) return false;
  return fired.some(
    (f) => ids.includes(f.id) && (f.tier === "RED" || f.tier === "AMBER"),
  );
}

/**
 * Client-side photo quality gate. Downscales the captured frame, computes mean
 * luminance (too-dark detection) and the variance of the Laplacian (blur
 * detection). Higher Laplacian variance = sharper edges = less blur.
 */
export function analyzeFrame(source: HTMLCanvasElement | HTMLVideoElement): QualityResult {
  const srcW =
    source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  const srcH =
    source instanceof HTMLVideoElement ? source.videoHeight : source.height;
  const fail: QualityResult = { blur: 0, brightness: 0, pass: false, state: "dark" };
  if (!srcW || !srcH) return fail;

  const w = 160;
  const h = Math.max(1, Math.round((w * srcH) / srcW));
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const ctx = tmp.getContext("2d");
  if (!ctx) return fail;
  ctx.drawImage(source, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const gray = new Float32Array(w * h);
  let lumSum = 0;
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i] = lum;
    lumSum += lum;
  }
  const brightness = lumSum / (w * h);

  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const lap =
        gray[idx - 1] +
        gray[idx + 1] +
        gray[idx - w] +
        gray[idx + w] -
        4 * gray[idx];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  const mean = n ? sum / n : 0;
  const variance = n ? sumSq / n - mean * mean : 0;

  // Heuristic thresholds — tuned for typical phone intra-oral shots.
  const DARK_BELOW = 45;
  const SHARP_ABOVE = 55;
  let state: QualityResult["state"];
  if (brightness < DARK_BELOW) state = "dark";
  else if (variance < SHARP_ABOVE) state = "blurry";
  else state = "ok";

  return {
    blur: Math.round(variance),
    brightness: Math.round(brightness),
    pass: state === "ok",
    state,
  };
}
