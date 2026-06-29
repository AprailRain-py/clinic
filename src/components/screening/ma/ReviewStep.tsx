"use client";

import { TriagePanel } from "@/components/screening/primitives";
import type { OralEvalResult } from "@/lib/screening";
import type { OralQuestionnaire } from "@/lib/validators/screening";
import type { SelectedPatient } from "./types";

function SummaryRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "13px 0",
        borderBottom: last ? "none" : "1px solid #f1f4f4",
      }}
    >
      <span style={{ font: "400 13px var(--ip-sans), sans-serif", color: "var(--muted)" }}>{label}</span>
      <span style={{ font: "600 13px var(--ip-sans), sans-serif", color: "var(--ink)", textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

function riskSummary(q: OralQuestionnaire): { label: string; value: string }[] {
  const rf = q.riskFactors;
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const rows: { label: string; value: string }[] = [];
  rows.push({
    label: "Smokeless tobacco",
    value:
      rf.smokelessStatus === "never"
        ? "Never"
        : `${cap(rf.smokelessStatus)}${rf.smokelessType.length ? ` · ${rf.smokelessType.length} type(s)` : ""}`,
  });
  rows.push({
    label: "Smoking",
    value: rf.smokedStatus === "never" ? "Never" : cap(rf.smokedStatus),
  });
  rows.push({ label: "Areca nut / paan", value: cap(rf.paan) });
  rows.push({ label: "Alcohol", value: cap(rf.alcohol) });
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
  const rows = riskSummary(questionnaire);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <TriagePanel band={result.band} score={result.score} reasons={result.firedReasons} />

      <div>
        <div
          className="eyebrow"
          style={{ marginBottom: 10 }}
        >
          Summary
        </div>
        <div className="card" style={{ padding: "2px 16px" }}>
          <SummaryRow label="Patient" value={`${patient.name} · ${patient.age} · ${patient.gender}`} />
          {rows.map((r) => (
            <SummaryRow key={r.label} label={r.label} value={r.value} />
          ))}
          <SummaryRow
            label="Photos captured"
            value={`${capturedCount} / ${totalViews}`}
            last
          />
        </div>
      </div>
    </div>
  );
}
