"use client";

import { DurChipRow, SymptomRow } from "@/components/screening/primitives";
import type { FiredFactor } from "@/lib/screening";
import { LESION_DURATION_OPTIONS, SYMPTOM_ITEMS } from "@/lib/screening/oral-form";
import type { OralSymptoms } from "@/lib/validators/screening";
import { isSymptomFired } from "./helpers";
import type { QuestionnaireStepProps } from "./types";
import { StepIntro } from "./StepKit";

export default function SymptomsStep({
  questionnaire,
  setQuestionnaire,
  firedReasons,
}: QuestionnaireStepProps & { firedReasons: FiredFactor[] }) {
  const symptoms = questionnaire.symptoms;
  const getBool = (k: string) => Boolean((symptoms as Record<string, unknown>)[k]);

  function setSymptoms(patch: Partial<OralSymptoms>) {
    setQuestionnaire((q) => ({ ...q, symptoms: { ...q.symptoms, ...patch } as OralSymptoms }));
  }

  return (
    <div>
      <StepIntro>
        Tap each symptom the patient has. Items that cross a referral threshold
        are flagged for the doctor automatically.
      </StepIntro>

      <div className="space-y-2.5">
        {SYMPTOM_ITEMS.map((item) => {
          const on = getBool(item.key);
          return (
            <SymptomRow
              key={item.key}
              label={item.label}
              on={on}
              fired={on && isSymptomFired(item.key, firedReasons)}
              onToggle={() => setSymptoms({ [item.key]: !on } as Partial<OralSymptoms>)}
            >
              {item.needsDuration ? (
                <div>
                  <div className="eyebrow mb-2">Present for</div>
                  <DurChipRow
                    options={LESION_DURATION_OPTIONS}
                    value={symptoms.lesionDuration ?? null}
                    onChange={(v) =>
                      setSymptoms({ lesionDuration: v as OralSymptoms["lesionDuration"] })
                    }
                  />
                </div>
              ) : null}
              {item.needsMm ? (
                <div>
                  <div className="eyebrow mb-2">Mouth opening</div>
                  <div className="flex items-center gap-2">
                    <input
                      className="input-field font-mono"
                      style={{ maxWidth: 120 }}
                      inputMode="numeric"
                      value={symptoms.mouthOpeningMm ?? ""}
                      placeholder="28"
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^0-9]/g, "");
                        setSymptoms({
                          mouthOpeningMm: digits === "" ? undefined : Number(digits),
                        });
                      }}
                    />
                    <span className="text-sm text-[--color-muted]">mm (interincisal)</span>
                  </div>
                </div>
              ) : null}
            </SymptomRow>
          );
        })}
      </div>
    </div>
  );
}
