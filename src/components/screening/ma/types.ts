// Shared types for the MA (Medical-Assistant) oral screening capture flow.
// Pure type module — safe to import from any 'use client' step component.

import type { OralQuestionnaire } from "@/lib/validators/screening";

/** The minimal patient identity the capture flow carries in state. */
export type SelectedPatient = {
  patientId: string;
  name: string;
  age: number;
  gender: string;
};

/** Result of the client-side photo quality gate. */
export type QualityResult = {
  /** Variance-of-Laplacian — higher = sharper. */
  blur: number;
  /** Mean luminance 0..255 — lower = darker. */
  brightness: number;
  pass: boolean;
  state: "ok" | "blurry" | "dark";
};

/** A captured (and uploaded) guided-view photo. */
export type CapturedShot = {
  viewId: string;
  quality: QualityResult;
  /** Small data-URL preview kept only in memory for the thumbnail strip. */
  thumbUrl: string;
};

/** Map of viewId → captured shot. */
export type CapturedMap = Record<string, CapturedShot>;

/** Props every step receives for reading/patching the questionnaire. */
export type QuestionnaireStepProps = {
  questionnaire: OralQuestionnaire;
  setQuestionnaire: React.Dispatch<React.SetStateAction<OralQuestionnaire>>;
};
