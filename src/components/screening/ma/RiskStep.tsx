"use client";

import { Switch } from "@/components/screening/primitives";
import {
  ALCOHOL_OPTIONS,
  HABIT_STATUS_OPTIONS,
  PAAN_OPTIONS,
  QUID_SITE_OPTIONS,
  SMOKED_TYPE_OPTIONS,
  SMOKELESS_TYPE_OPTIONS,
} from "@/lib/screening/oral-form";
import type { OralRiskFactors } from "@/lib/validators/screening";
import type { QuestionnaireStepProps } from "./types";
import { ChoiceGroup, PickGroup, SegControl, Section, StepIntro } from "./StepKit";

function SubField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="eyebrow mb-2">{label}</div>
      {children}
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
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-[--color-ink]">{label}</span>
        <span className="font-mono text-sm font-semibold text-[--color-pine]">
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2.5 w-full"
        style={{ accentColor: "var(--color-pine)", height: 6 }}
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

  const switches: { label: string; key: keyof OralRiskFactors; on: boolean }[] = [
    { label: "Tobacco added to paan / quid", key: "paanTobaccoAdded", on: rf.paanTobaccoAdded },
    { label: "Family history of oral cancer", key: "familyHistory", on: rf.familyHistory },
    { label: "Sharp tooth / ill-fitting denture", key: "chronicTrauma", on: rf.chronicTrauma },
  ];

  return (
    <div className="space-y-4">
      <StepIntro>Record the patient&rsquo;s habits — these feed the live triage above.</StepIntro>

      <Section title="Smokeless tobacco / areca">
        <SegControl
          options={HABIT_STATUS_OPTIONS}
          value={rf.smokelessStatus}
          onChange={(v) => patch({ smokelessStatus: v as OralRiskFactors["smokelessStatus"] })}
          ariaLabel="Smokeless tobacco use"
        />
        {rf.smokelessStatus !== "never" ? (
          <SubField label="Type">
            <PickGroup
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
          </SubField>
        ) : null}
        {rf.smokelessStatus === "current" ? (
          <SubField label="Quid-parking site">
            <ChoiceGroup
              options={QUID_SITE_OPTIONS}
              value={rf.quidSite ?? ""}
              onChange={(v) => patch({ quidSite: v as OralRiskFactors["quidSite"] })}
            />
          </SubField>
        ) : null}
      </Section>

      <Section title="Smoking">
        <SegControl
          options={HABIT_STATUS_OPTIONS}
          value={rf.smokedStatus}
          onChange={(v) => patch({ smokedStatus: v as OralRiskFactors["smokedStatus"] })}
          ariaLabel="Smoking"
        />
        {rf.smokedStatus !== "never" ? (
          <SubField label="Type">
            <PickGroup
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
          </SubField>
        ) : null}
        {rf.smokedStatus === "current" ? (
          <div className="mt-5 space-y-5 border-t border-[--color-rule] pt-5">
            <Slider label="Years of use" value={rf.smokedYears ?? 0} max={50} unit="yrs" onChange={(v) => patch({ smokedYears: v })} />
            <Slider label="Quantity per day" value={rf.smokedPerDay ?? 0} max={40} unit="/ day" onChange={(v) => patch({ smokedPerDay: v })} />
          </div>
        ) : null}
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Areca nut / paan">
          <SegControl
            options={PAAN_OPTIONS}
            value={rf.paan}
            onChange={(v) => patch({ paan: v as OralRiskFactors["paan"] })}
            ariaLabel="Areca / paan"
          />
        </Section>
        <Section title="Alcohol">
          <SegControl
            options={ALCOHOL_OPTIONS}
            value={rf.alcohol}
            onChange={(v) => patch({ alcohol: v as OralRiskFactors["alcohol"] })}
            ariaLabel="Alcohol"
          />
        </Section>
      </div>

      <Section title="Other factors">
        <div className="-my-1.5 divide-y divide-[--color-rule]">
          {switches.map((s) => (
            <div key={s.key} className="flex items-center py-3.5">
              <span className="flex-1 text-[15px] text-[--color-ink]">{s.label}</span>
              <Switch on={s.on} onChange={(v) => patch({ [s.key]: v } as Partial<OralRiskFactors>)} />
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
