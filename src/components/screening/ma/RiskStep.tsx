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

const UNIT_OPTS = [
  { value: "years", label: "Years" },
  { value: "months", label: "Months" },
];

function SubField({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <div className="eyebrow mb-2">
        {label}
        {optional ? (
          <span className="ml-2 normal-case tracking-normal text-[--color-muted-2]">optional</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function numDigits(v: string, max: number): number | undefined {
  const d = v.replace(/[^0-9]/g, "");
  return d === "" ? undefined : Math.min(max, Number(d));
}

// Per-day amount + duration (with a Years/Months unit so short-term use is
// recordable). Top-level so the inputs keep focus while typing.
function HabitDetail({
  perDay,
  perDayLabel,
  onPerDay,
  duration,
  unit,
  onDuration,
  onUnit,
}: {
  perDay?: number;
  perDayLabel: string;
  onPerDay: (n: number | undefined) => void;
  duration?: number;
  unit?: string;
  onDuration: (n: number | undefined) => void;
  onUnit: (u: string) => void;
}) {
  return (
    <div className="mt-5 grid gap-5 border-t border-[--color-rule] pt-5 sm:grid-cols-2">
      <SubField label={perDayLabel} optional>
        <input
          className="input-field font-mono"
          style={{ maxWidth: 160 }}
          inputMode="numeric"
          value={perDay ?? ""}
          placeholder="e.g. 5"
          onChange={(e) => onPerDay(numDigits(e.target.value, 100))}
        />
      </SubField>
      <SubField label="How long used" optional>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input-field font-mono"
            style={{ width: 90 }}
            inputMode="numeric"
            value={duration ?? ""}
            placeholder="6"
            onChange={(e) => onDuration(numDigits(e.target.value, 600))}
          />
          <SegControl options={UNIT_OPTS} value={unit ?? "years"} onChange={onUnit} ariaLabel="Duration unit" />
        </div>
      </SubField>
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
      <StepIntro>Record the patient&rsquo;s habits — these feed the live triage. Details are optional.</StepIntro>

      <Section title="Smokeless tobacco / areca">
        <SegControl
          options={HABIT_STATUS_OPTIONS}
          value={rf.smokelessStatus}
          onChange={(v) => patch({ smokelessStatus: v as OralRiskFactors["smokelessStatus"] })}
          ariaLabel="Smokeless tobacco use"
        />
        {rf.smokelessStatus !== "never" ? (
          <SubField label="Type" optional>
            <PickGroup
              options={SMOKELESS_TYPE_OPTIONS}
              values={rf.smokelessType}
              onToggle={(v) =>
                patch({
                  smokelessType: toggle(rf.smokelessType, v as OralRiskFactors["smokelessType"][number]),
                })
              }
            />
          </SubField>
        ) : null}
        {rf.smokelessStatus === "current" ? (
          <>
            <SubField label="Quid-parking site" optional>
              <ChoiceGroup
                options={QUID_SITE_OPTIONS}
                value={rf.quidSite ?? ""}
                onChange={(v) => patch({ quidSite: v as OralRiskFactors["quidSite"] })}
              />
            </SubField>
            <HabitDetail
              perDay={rf.smokelessPerDay}
              perDayLabel="Times per day"
              onPerDay={(n) => patch({ smokelessPerDay: n })}
              duration={rf.smokelessYears}
              unit={rf.smokelessUseUnit}
              onDuration={(n) => patch({ smokelessYears: n })}
              onUnit={(u) => patch({ smokelessUseUnit: u as OralRiskFactors["smokelessUseUnit"] })}
            />
          </>
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
          <SubField label="Type" optional>
            <PickGroup
              options={SMOKED_TYPE_OPTIONS}
              values={rf.smokedType}
              onToggle={(v) =>
                patch({ smokedType: toggle(rf.smokedType, v as OralRiskFactors["smokedType"][number]) })
              }
            />
          </SubField>
        ) : null}
        {rf.smokedStatus === "current" ? (
          <HabitDetail
            perDay={rf.smokedPerDay}
            perDayLabel="Cigarettes / bidis per day"
            onPerDay={(n) => patch({ smokedPerDay: n })}
            duration={rf.smokedYears}
            unit={rf.smokedUseUnit}
            onDuration={(n) => patch({ smokedYears: n })}
            onUnit={(u) => patch({ smokedUseUnit: u as OralRiskFactors["smokedUseUnit"] })}
          />
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
