"use client";

import { Chip, Switch } from "@/components/screening/primitives";
import {
  ALCOHOL_OPTIONS,
  HABIT_STATUS_OPTIONS,
  PAAN_OPTIONS,
  QUID_SITE_OPTIONS,
  SMOKED_TYPE_OPTIONS,
  SMOKELESS_TYPE_OPTIONS,
  type Opt,
} from "@/lib/screening/oral-form";
import type { OralRiskFactors } from "@/lib/validators/screening";
import type { QuestionnaireStepProps } from "./types";

const eyebrow: React.CSSProperties = {
  font: "600 11px var(--ip-mono), monospace",
  letterSpacing: "0.1em",
  color: "var(--faint)",
  textTransform: "uppercase",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={eyebrow}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 11 }}>
        {children}
      </div>
    </div>
  );
}

function SingleChips({
  options,
  value,
  onPick,
}: {
  options: Opt[];
  value: string;
  onPick: (v: string) => void;
}) {
  return (
    <>
      {options.map((o) => (
        <Chip key={o.value} on={value === o.value} onClick={() => onPick(o.value)}>
          {o.label}
        </Chip>
      ))}
    </>
  );
}

function MultiChips({
  options,
  values,
  onToggle,
}: {
  options: Opt[];
  values: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <>
      {options.map((o) => (
        <Chip key={o.value} on={values.includes(o.value)} onClick={() => onToggle(o.value)}>
          {o.label}
        </Chip>
      ))}
    </>
  );
}

function SwitchRow({
  label,
  on,
  onChange,
  divider,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
  divider?: boolean;
}) {
  return (
    <div
      onClick={() => onChange(!on)}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "15px 16px",
        cursor: "pointer",
        borderTop: divider ? "1px solid var(--line)" : "none",
      }}
    >
      <div style={{ flex: 1, font: "500 15px var(--ip-sans), sans-serif", color: "var(--ink)" }}>
        {label}
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <Switch on={on} onChange={onChange} />
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ font: "600 13px var(--ip-sans), sans-serif", color: "var(--ink)" }}>
          {label}
        </span>
        <span className="mono" style={{ font: "600 16px var(--ip-mono), monospace", color: "var(--tl)" }}>
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", marginTop: 10, accentColor: "var(--tl)", height: 6 }}
      />
    </div>
  );
}

export default function RiskStep({ questionnaire, setQuestionnaire }: QuestionnaireStepProps) {
  const rf = questionnaire.riskFactors;

  function patch(p: Partial<OralRiskFactors>) {
    setQuestionnaire((q) => ({ ...q, riskFactors: { ...q.riskFactors, ...p } }));
  }
  function toggle<T extends string>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ font: "400 14px var(--ip-sans), sans-serif", color: "var(--muted)", marginTop: -2 }}>
        Tap all that apply — large targets, minimal typing.
      </div>

      {/* Smokeless tobacco */}
      <Section title="Smokeless tobacco">
        <SingleChips
          options={HABIT_STATUS_OPTIONS}
          value={rf.smokelessStatus}
          onPick={(v) => patch({ smokelessStatus: v as OralRiskFactors["smokelessStatus"] })}
        />
      </Section>
      {rf.smokelessStatus !== "never" && (
        <Section title="Smokeless type">
          <MultiChips
            options={SMOKELESS_TYPE_OPTIONS}
            values={rf.smokelessType}
            onToggle={(v) =>
              patch({
                smokelessType: toggle(
                  rf.smokelessType,
                  v as OralRiskFactors["smokelessType"][number],
                ),
              })
            }
          />
        </Section>
      )}
      {rf.smokelessStatus === "current" && (
        <Section title="Quid-parking site">
          <SingleChips
            options={QUID_SITE_OPTIONS}
            value={rf.quidSite ?? ""}
            onPick={(v) => patch({ quidSite: v as OralRiskFactors["quidSite"] })}
          />
        </Section>
      )}

      {/* Smoking */}
      <Section title="Smoking">
        <SingleChips
          options={HABIT_STATUS_OPTIONS}
          value={rf.smokedStatus}
          onPick={(v) => patch({ smokedStatus: v as OralRiskFactors["smokedStatus"] })}
        />
      </Section>
      {rf.smokedStatus !== "never" && (
        <Section title="Smoked type">
          <MultiChips
            options={SMOKED_TYPE_OPTIONS}
            values={rf.smokedType}
            onToggle={(v) =>
              patch({
                smokedType: toggle(
                  rf.smokedType,
                  v as OralRiskFactors["smokedType"][number],
                ),
              })
            }
          />
        </Section>
      )}
      {rf.smokedStatus === "current" && (
        <div
          className="card"
          style={{ padding: 18, display: "flex", flexDirection: "column", gap: 20 }}
        >
          <Slider
            label="Years of use"
            value={rf.smokedYears ?? 0}
            max={50}
            unit="yrs"
            onChange={(v) => patch({ smokedYears: v })}
          />
          <Slider
            label="Quantity per day"
            value={rf.smokedPerDay ?? 0}
            max={40}
            unit="/ day"
            onChange={(v) => patch({ smokedPerDay: v })}
          />
        </div>
      )}

      {/* Areca / paan */}
      <Section title="Areca nut / paan">
        <SingleChips
          options={PAAN_OPTIONS}
          value={rf.paan}
          onPick={(v) => patch({ paan: v as OralRiskFactors["paan"] })}
        />
      </Section>

      {/* Alcohol */}
      <Section title="Alcohol">
        <SingleChips
          options={ALCOHOL_OPTIONS}
          value={rf.alcohol}
          onPick={(v) => patch({ alcohol: v as OralRiskFactors["alcohol"] })}
        />
      </Section>

      {/* Toggles */}
      <div className="card" style={{ overflow: "hidden", padding: 0 }}>
        <SwitchRow
          label="Tobacco added to paan / quid"
          on={rf.paanTobaccoAdded}
          onChange={(v) => patch({ paanTobaccoAdded: v })}
        />
        <SwitchRow
          divider
          label="Family history of oral cancer"
          on={rf.familyHistory}
          onChange={(v) => patch({ familyHistory: v })}
        />
        <SwitchRow
          divider
          label="Sharp tooth / ill-fitting denture"
          on={rf.chronicTrauma}
          onChange={(v) => patch({ chronicTrauma: v })}
        />
      </div>
    </div>
  );
}
