"use client";

import { ConsentRow } from "@/components/screening/primitives";
import { initials } from "./helpers";
import type { QuestionnaireStepProps, SelectedPatient } from "./types";
import { Field } from "./StepKit";

export default function ConsentStep({
  patient,
  questionnaire,
  setQuestionnaire,
}: QuestionnaireStepProps & { patient: SelectedPatient }) {
  const abha = questionnaire.abha ?? "";
  const abhaInvalid = abha.length > 0 && !/^\d{14}$/.test(abha);

  return (
    <div className="space-y-5">
      {/* selected patient */}
      <div className="card flex items-center gap-3.5 p-4">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-pine-soft font-mono text-sm font-semibold text-[--color-pine]">
          {initials(patient.name)}
        </span>
        <div className="min-w-0">
          <div className="truncate font-medium text-[--color-ink]">{patient.name}</div>
          <div className="text-xs text-[--color-muted]">
            {patient.age} yr · {patient.gender}
          </div>
        </div>
        <span className="eyebrow ml-auto">Oral screening</span>
      </div>

      {/* consent */}
      <section className="card p-5 md:p-6">
        <h2 className="font-display text-lg font-medium">Patient consent</h2>
        <p className="mt-2 text-sm leading-relaxed text-[--color-ink-soft]">
          Clinical photographs of the mouth will be captured and stored as part
          of this screening. Images may be reviewed by a clinician to support a
          referral decision. No images are shared outside the clinic without
          further consent.
        </p>
        <div className="mt-4">
          <ConsentRow
            on={questionnaire.consent}
            onChange={(v) => setQuestionnaire((q) => ({ ...q, consent: v }))}
          >
            I have explained the procedure and the patient consents to
            photographs being captured and stored.
          </ConsentRow>
        </div>
      </section>

      {/* ABHA */}
      <section className="card p-5 md:p-6">
        <Field label="ABHA health ID" hint="optional" error={abhaInvalid ? "Must be exactly 14 digits." : undefined}>
          <input
            className="input-field font-mono"
            value={abha}
            inputMode="numeric"
            maxLength={14}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 14);
              setQuestionnaire((q) => ({ ...q, abha: digits || undefined }));
            }}
            placeholder="14-digit ABHA number"
          />
        </Field>
      </section>
    </div>
  );
}
