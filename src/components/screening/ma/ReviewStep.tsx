"use client";

import { TriagePanel } from "@/components/screening/primitives";
import type { OralEvalResult } from "@/lib/screening";
import type { OralQuestionnaire } from "@/lib/validators/screening";
import type { SelectedPatient } from "./types";

function riskSummary(q: OralQuestionnaire): { label: string; value: string }[] {
  const rf = q.riskFactors;
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const rows: { label: string; value: string }[] = [
    {
      label: "Smokeless tobacco",
      value:
        rf.smokelessStatus === "never"
          ? "Never"
          : `${cap(rf.smokelessStatus)}${rf.smokelessType.length ? ` · ${rf.smokelessType.length} type(s)` : ""}`,
    },
    { label: "Smoking", value: rf.smokedStatus === "never" ? "Never" : cap(rf.smokedStatus) },
    { label: "Areca nut / paan", value: cap(rf.paan) },
    { label: "Alcohol", value: cap(rf.alcohol) },
  ];
  if (rf.familyHistory) rows.push({ label: "Family history", value: "Yes" });
  return rows;
}

export default function ReviewStep({
  patient,
  questionnaire,
  result,
  capturedCount,
  totalViews,
}: {
  patient: SelectedPatient;
  questionnaire: OralQuestionnaire;
  result: OralEvalResult;
  capturedCount: number;
  totalViews: number;
}) {
  const rows = [
    { label: "Patient", value: `${patient.name} · ${patient.age} · ${patient.gender}` },
    ...riskSummary(questionnaire),
    { label: "Photos captured", value: `${capturedCount} / ${totalViews}` },
  ];

  return (
    <div className="space-y-5">
      <TriagePanel band={result.band} score={result.score} reasons={result.firedReasons} />

      <section className="card p-5 md:p-6">
        <h3 className="eyebrow mb-2">Summary</h3>
        <dl className="divide-y divide-[--color-rule]">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-[--color-muted]">{r.label}</dt>
              <dd className="text-right text-sm font-medium text-[--color-ink]">{r.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
