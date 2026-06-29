"use client";

import { Switch } from "@/components/screening/primitives";
import {
  LESION_TYPE_OPTIONS,
  SUBSITE_OPTIONS,
  type Opt,
} from "@/lib/screening/oral-form";
import type { OralLesion } from "@/lib/validators/screening";
import type { QuestionnaireStepProps } from "./types";

const labelStyle: React.CSSProperties = {
  font: "600 10px var(--ip-mono), monospace",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--faint)",
  marginBottom: 7,
};

function Select({
  options,
  value,
  onChange,
}: {
  options: Opt[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <select
      className="field"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ appearance: "auto" }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

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
      <div
        style={{
          font: "400 14px var(--ip-sans), sans-serif",
          color: "var(--muted)",
          marginBottom: 16,
        }}
      >
        Optional — record any lesion you can see. You can submit with none.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {lesions.map((l, idx) => (
          <div key={idx} className="card" style={{ padding: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <span style={{ font: "600 14px var(--ip-sans), sans-serif", color: "var(--ink)" }}>
                Lesion {idx + 1}
              </span>
              <button
                type="button"
                onClick={() => setLesions(lesions.filter((_, i) => i !== idx))}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--hi-fg)",
                  font: "600 13px var(--ip-sans), sans-serif",
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={labelStyle}>Subsite</div>
              <Select
                options={SUBSITE_OPTIONS}
                value={l.subsite}
                onChange={(v) => patchLesion(idx, { subsite: v as OralLesion["subsite"] })}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={labelStyle}>Appearance</div>
              <Select
                options={LESION_TYPE_OPTIONS}
                value={l.lesionType}
                onChange={(v) => patchLesion(idx, { lesionType: v as OralLesion["lesionType"] })}
              />
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
              <div style={{ width: 130 }}>
                <div style={labelStyle}>Size (mm)</div>
                <input
                  className="field"
                  inputMode="numeric"
                  value={l.sizeMm ?? ""}
                  placeholder="e.g. 12"
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^0-9]/g, "");
                    patchLesion(idx, { sizeMm: digits === "" ? undefined : Number(digits) });
                  }}
                />
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: 8,
                }}
              >
                <span style={{ font: "500 14px var(--ip-sans), sans-serif", color: "var(--ink)" }}>
                  Indurated
                </span>
                <Switch on={l.induration} onChange={(v) => patchLesion(idx, { induration: v })} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setLesions([...lesions, newLesion()])}
        style={{
          width: "100%",
          marginTop: lesions.length ? 14 : 0,
          padding: 15,
          border: "1.5px dashed #c7d2d3",
          borderRadius: 13,
          background: "#fff",
          font: "600 14px var(--ip-sans), sans-serif",
          color: "var(--tl)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add lesion
      </button>
    </div>
  );
}
