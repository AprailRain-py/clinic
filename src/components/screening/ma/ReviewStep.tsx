"use client";

import { TriagePanel } from "@/components/screening/primitives";
import type { OralEvalResult } from "@/lib/screening";
import type { CaptureView } from "@/lib/screening/oral-form";
import type { OralQuestionnaire } from "@/lib/validators/screening";
import type { CapturedMap, SelectedPatient } from "./types";

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
  views,
  captured,
  capturedCount,
  totalViews,
}: {
  patient: SelectedPatient;
  questionnaire: OralQuestionnaire;
  result: OralEvalResult;
  views: CaptureView[];
  captured: CapturedMap;
  capturedCount: number;
  totalViews: number;
}) {
  const rows = [
    { label: "Patient", value: `${patient.name} · ${patient.age} · ${patient.gender}` },
    ...riskSummary(questionnaire),
  ];

  return (
    <div className="space-y-5">
      <TriagePanel band={result.band} score={result.score} reasons={result.firedReasons} />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Photographs */}
        <section className="card p-5 md:p-6">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="eyebrow">Photographs</h3>
            <span className="font-mono text-xs text-[--color-muted]">
              {capturedCount} / {totalViews}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-3">
            {views.map((v) => {
              const shot = captured[v.id];
              return (
                <div key={v.id} className="min-w-0">
                  <div
                    className="aspect-square overflow-hidden rounded-lg border border-[--color-rule]"
                    style={{ background: shot ? undefined : "var(--color-paper-2)" }}
                  >
                    {shot ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={shot.thumbUrl} alt={v.label} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[--color-muted-2]">
                        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                          <path d="M3 7h4l2-2h6l2 2h4v12H3z" stroke="currentColor" strokeWidth="1.5" />
                          <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="mt-1 truncate text-[11px] text-[--color-muted]" title={v.label}>
                    {v.label}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Summary */}
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
    </div>
  );
}
