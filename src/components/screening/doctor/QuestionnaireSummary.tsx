"use client";

import {
  SYMPTOM_ITEMS,
  HABIT_STATUS_OPTIONS,
  PAAN_OPTIONS,
  ALCOHOL_OPTIONS,
  LESION_DURATION_OPTIONS,
} from "@/lib/screening/oral-form";
import type { OralQuestionnaire } from "@/lib/validators/screening";

function labelOf(
  options: { value: string; label: string }[],
  value: string | undefined,
): string {
  return options.find((o) => o.value === value)?.label ?? value ?? "—";
}

type Row = { label: string; value: string };

// Duration value is stored in the unit the MA chose (years or months) — render
// it with that unit so "10 months" never reads as "10 yrs".
function durationLabel(
  value: number | undefined,
  unit: string | undefined,
): string | null {
  if (!value) return null;
  return `${value} ${unit === "months" ? "mo" : "yrs"}`;
}

function riskRows(q: OralQuestionnaire): Row[] {
  const rf = q.riskFactors;
  const rows: Row[] = [];

  if (rf.smokedStatus !== "never") {
    const parts: string[] = [labelOf(HABIT_STATUS_OPTIONS, rf.smokedStatus)];
    if (rf.smokedPerDay) parts.push(`${rf.smokedPerDay}/day`);
    const d = durationLabel(rf.smokedYears, rf.smokedUseUnit);
    if (d) parts.push(d);
    rows.push({ label: "Smoking", value: parts.join(" · ") });
  }
  if (rf.smokelessStatus !== "never") {
    const parts: string[] = [labelOf(HABIT_STATUS_OPTIONS, rf.smokelessStatus)];
    if (rf.smokelessPerDay) parts.push(`${rf.smokelessPerDay}/day`);
    const d = durationLabel(rf.smokelessYears, rf.smokelessUseUnit);
    if (d) parts.push(d);
    rows.push({ label: "Smokeless tobacco", value: parts.join(" · ") });
  }
  if (rf.paan !== "never") {
    rows.push({
      label: "Areca nut / paan",
      value:
        labelOf(PAAN_OPTIONS, rf.paan) +
        (rf.paanTobaccoAdded ? " · with tobacco" : ""),
    });
  }
  if (rf.alcohol !== "never") {
    rows.push({ label: "Alcohol", value: labelOf(ALCOHOL_OPTIONS, rf.alcohol) });
  }
  if (rf.familyHistory) rows.push({ label: "Family history", value: "Yes" });
  if (rf.chronicTrauma)
    rows.push({ label: "Chronic trauma", value: "Yes" });

  return rows;
}

type SymRow = { label: string; detail: string | null };

function symptomRows(q: OralQuestionnaire): SymRow[] {
  const s = q.symptoms as Record<string, unknown>;
  return SYMPTOM_ITEMS.filter((it) => s[it.key] === true).map((it) => {
    let detail: string | null = null;
    if (it.needsDuration && q.symptoms.lesionDuration) {
      detail = labelOf(LESION_DURATION_OPTIONS, q.symptoms.lesionDuration);
    }
    if (it.needsMm && q.symptoms.mouthOpeningMm != null) {
      detail = `${q.symptoms.mouthOpeningMm} mm opening`;
    }
    return { label: it.label, detail };
  });
}

/** Readable risk-factor + symptom summary parsed from the questionnaire JSON. */
export function QuestionnaireSummary({ q }: { q: OralQuestionnaire }) {
  const risks = riskRows(q);
  const symptoms = symptomRows(q);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          Risk factors
        </div>
        <div className="card" style={{ padding: "2px 16px" }}>
          {risks.length === 0 ? (
            <div className="scr-sub" style={{ padding: "12px 0" }}>
              No habit / risk factors recorded.
            </div>
          ) : (
            risks.map((r, i) => (
              <div
                key={r.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 0",
                  borderTop: i === 0 ? "none" : "1px solid var(--line)",
                }}
              >
                <span style={{ fontSize: 13, color: "var(--muted)" }}>
                  {r.label}
                </span>
                <span
                  style={{ fontSize: 13, fontWeight: 600, textAlign: "right" }}
                >
                  {r.value}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          Symptoms &amp; flags
        </div>
        {symptoms.length === 0 ? (
          <div className="card" style={{ padding: 16 }}>
            <div className="scr-sub">None reported.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {symptoms.map((x) => (
              <div
                key={x.label}
                className="card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 13px",
                }}
              >
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>
                  {x.label}
                </span>
                {x.detail && (
                  <span
                    className="mono"
                    style={{ fontSize: 12, color: "var(--muted)" }}
                  >
                    {x.detail}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
