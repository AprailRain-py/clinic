"use client";

import { Switch } from "@/components/screening/primitives";
import { LESION_TYPE_OPTIONS, SUBSITE_OPTIONS } from "@/lib/screening/oral-form";
import type { OralLesion } from "@/lib/validators/screening";
import type { QuestionnaireStepProps } from "./types";
import { Field, StepIntro } from "./StepKit";

function newLesion(): OralLesion {
  return { subsite: "buccal_mucosa", lesionType: "ulcer", induration: false };
}

export default function ExamStep({ questionnaire, setQuestionnaire }: QuestionnaireStepProps) {
  const lesions = questionnaire.lesions;

  function setLesions(next: OralLesion[]) {
    setQuestionnaire((q) => ({ ...q, lesions: next }));
  }
  function patchLesion(idx: number, p: Partial<OralLesion>) {
    setLesions(lesions.map((l, i) => (i === idx ? { ...l, ...p } : l)));
  }

  return (
    <div>
      <StepIntro>
        Optional — record any lesion you can see on examination. You can submit
        with none.
      </StepIntro>

      <div className="space-y-4">
        {lesions.map((l, idx) => (
          <section key={idx} className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-medium">Lesion {idx + 1}</h3>
              <button
                type="button"
                onClick={() => setLesions(lesions.filter((_, i) => i !== idx))}
                className="text-xs font-semibold text-[--color-rust] hover:underline"
              >
                Remove
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Subsite">
                <select
                  className="input-field"
                  value={l.subsite}
                  onChange={(e) => patchLesion(idx, { subsite: e.target.value as OralLesion["subsite"] })}
                >
                  {SUBSITE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Appearance">
                <select
                  className="input-field"
                  value={l.lesionType}
                  onChange={(e) => patchLesion(idx, { lesionType: e.target.value as OralLesion["lesionType"] })}
                >
                  {LESION_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-[8rem_1fr] sm:items-end">
              <Field label="Size (mm)">
                <input
                  className="input-field font-mono"
                  inputMode="numeric"
                  value={l.sizeMm ?? ""}
                  placeholder="12"
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^0-9]/g, "");
                    patchLesion(idx, { sizeMm: digits === "" ? undefined : Number(digits) });
                  }}
                />
              </Field>
              <div className="flex items-center justify-between rounded-xl border border-[--color-rule] bg-card px-4 py-3">
                <span className="text-[15px] text-[--color-ink]">Indurated (hard)</span>
                <Switch on={l.induration} onChange={(v) => patchLesion(idx, { induration: v })} />
              </div>
            </div>
          </section>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setLesions([...lesions, newLesion()])}
        className={`flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[--color-rule] bg-card px-4 py-3.5 text-sm font-medium text-[--color-pine] transition hover:border-[--color-pine] ${lesions.length ? "mt-4" : ""}`}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        Add lesion
      </button>
    </div>
  );
}
