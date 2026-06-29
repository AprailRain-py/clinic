"use client";

import { DurChipRow, SymptomRow } from "@/components/screening/primitives";
import type { FiredFactor } from "@/lib/screening";
import { LESION_DURATION_OPTIONS, SYMPTOM_ITEMS } from "@/lib/screening/oral-form";
import type { OralSymptoms } from "@/lib/validators/screening";
import { isSymptomFired } from "./helpers";
import type { QuestionnaireStepProps } from "./types";

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
      <div
        style={{
          font: "400 14px var(--ip-sans), sans-serif",
          color: "var(--muted)",
          marginBottom: 14,
        }}
      >
        Tap a symptom, then set how long it has been present.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
              {item.needsDuration && (
                <div>
                  <div
                    className="mono"
                    style={{
                      font: "600 10px var(--ip-mono), monospace",
                      letterSpacing: "0.08em",
                      color: "var(--faint)",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Present for
                  </div>
                  <DurChipRow
                    options={LESION_DURATION_OPTIONS}
                    value={symptoms.lesionDuration ?? null}
                    onChange={(v) =>
                      setSymptoms({ lesionDuration: v as OralSymptoms["lesionDuration"] })
                    }
                  />
                </div>
              )}
              {item.needsMm && (
                <div>
                  <div
                    className="mono"
                    style={{
                      font: "600 10px var(--ip-mono), monospace",
                      letterSpacing: "0.08em",
                      color: "var(--faint)",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Mouth opening (mm)
                  </div>
                  <input
                    className="field"
                    style={{ maxWidth: 140 }}
                    inputMode="numeric"
                    value={symptoms.mouthOpeningMm ?? ""}
                    placeholder="e.g. 28"
                    onChange={(e) => {
                      const digits = e.target.value.replace(/[^0-9]/g, "");
                      setSymptoms({
                        mouthOpeningMm: digits === "" ? undefined : Number(digits),
                      });
                    }}
                  />
                </div>
              )}
            </SymptomRow>
          );
        })}
      </div>
    </div>
  );
}
