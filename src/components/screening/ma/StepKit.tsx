"use client";

import type { Band, FiredFactor } from "@/lib/screening";
import type { Opt } from "@/lib/screening/oral-form";
import { BandPill, CheckIcon } from "@/components/screening/primitives";

// Shared premium building blocks for the MA capture steps. Mirrors the app's
// own form aesthetic (card sections, eyebrow labels, .input-field inputs) so
// the screening flow feels like the most polished part of the clinic app.

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="eyebrow flex items-baseline justify-between">
        <span>{label}</span>
        {hint ? (
          <span className="normal-case tracking-normal text-[--color-muted-2]">
            {hint}
          </span>
        ) : null}
      </span>
      <div className="mt-1.5">{children}</div>
      {error ? <p className="mt-1.5 text-xs text-[--color-rust]">{error}</p> : null}
    </label>
  );
}

export function Section({
  title,
  desc,
  aside,
  children,
}: {
  title: string;
  desc?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5 md:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h3 className="eyebrow">{title}</h3>
          {desc ? (
            <p className="mt-1 text-sm text-[--color-muted]">{desc}</p>
          ) : null}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

// Connected segmented control — the premium replacement for a row of big
// detached chips on single-choice fields (sex, never/past/current, …).
export function SegControl({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Opt[];
  value: string;
  onChange: (v: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex flex-wrap gap-1 rounded-xl p-1"
      style={{
        background: "var(--color-paper-2)",
        border: "1px solid var(--color-rule)",
      }}
    >
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className="rounded-lg px-4 py-2 text-sm font-medium transition"
            style={
              on
                ? {
                    background: "var(--color-pine)",
                    color: "var(--color-paper)",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
                  }
                : { color: "var(--color-muted)" }
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Refined wrapping multi-select pills (smaller than the legacy big chips).
export function PickGroup({
  options,
  values,
  onToggle,
}: {
  options: Opt[];
  values: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = values.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o.value)}
            className="rounded-full border px-3.5 py-1.5 text-sm transition"
            style={
              on
                ? { background: "var(--color-pine)", color: "var(--color-paper)", borderColor: "var(--color-pine)" }
                : { background: "var(--color-card)", color: "var(--color-ink-soft)", borderColor: "var(--color-rule)" }
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// Single-choice as refined pills (when a connected segment would be too wide,
// e.g. quid-parking site).
export function ChoiceGroup({
  options,
  value,
  onChange,
}: {
  options: Opt[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className="rounded-full border px-3.5 py-1.5 text-sm transition"
            style={
              on
                ? { background: "var(--color-pine)", color: "var(--color-paper)", borderColor: "var(--color-pine)" }
                : { background: "var(--color-card)", color: "var(--color-ink-soft)", borderColor: "var(--color-rule)" }
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const BAND_STYLE: Record<Band, { dot: string; label: string }> = {
  high: { dot: "var(--color-rust)", label: "High" },
  moderate: { dot: "var(--color-ochre)", label: "Moderate" },
  low: { dot: "var(--color-pine)", label: "Low" },
};

// The "intelligence built in": a live, always-visible triage read-out that
// updates as the assistant fills the form — not a caption, a working signal.
export function LiveTriageBadge({
  band,
  topReason,
}: {
  band: Band;
  topReason?: string;
}) {
  const s = BAND_STYLE[band];
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-[--color-rule] bg-card py-1.5 pl-2.5 pr-3.5"
      title="Live triage — recalculated as you capture"
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ background: s.dot, boxShadow: `0 0 0 3px color-mix(in srgb, ${s.dot} 18%, transparent)` }}
      />
      <span className="font-mono text-[11px] uppercase tracking-wide text-[--color-muted]">
        Live
      </span>
      <span className="text-sm font-medium" style={{ color: s.dot }}>
        {s.label}
      </span>
      {topReason ? (
        <span className="hidden max-w-[16rem] truncate text-xs text-[--color-muted] sm:inline">
          · {topReason}
        </span>
      ) : null}
    </div>
  );
}

export function StepIntro({ children }: { children: React.ReactNode }) {
  return <p className="mb-5 text-[15px] text-[--color-muted]">{children}</p>;
}

function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Sidebar: who this screening is for.
export function SidebarPatient({
  name,
  age,
  gender,
}: {
  name: string;
  age: number;
  gender: string;
}) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-pine-soft font-mono text-sm font-semibold text-[--color-pine]">
        {avatarInitials(name)}
      </span>
      <div className="min-w-0">
        <div className="truncate font-medium text-[--color-ink]">{name}</div>
        <div className="text-xs text-[--color-muted]">
          {age} yr · {gender}
        </div>
      </div>
    </div>
  );
}

// Sidebar: the live triage read-out as a standing panel (intelligence on screen
// the whole time, not just a caption).
export function LiveTriagePanel({
  band,
  score,
  reasons,
}: {
  band: Band;
  score: number;
  reasons: FiredFactor[];
}) {
  const top = reasons.filter((r) => r.tier).slice(0, 4);
  return (
    <div className="card p-4">
      <div className="eyebrow mb-3">Live triage</div>
      <div className="flex items-center gap-2.5">
        <BandPill band={band} />
        <span className="font-mono text-sm text-[--color-muted]">score {score}</span>
      </div>
      {top.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {top.map((r) => (
            <li key={r.id} className="flex items-start gap-2 text-xs text-[--color-ink-soft]">
              <span
                className="mt-1 h-1.5 w-1.5 flex-none rounded-full"
                style={{ background: r.tier === "RED" ? "var(--color-rust)" : "var(--color-ochre)" }}
              />
              {r.reason}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-[--color-muted]">No flags yet.</p>
      )}
    </div>
  );
}

// Sidebar: vertical step progress.
export function Stepper({
  current,
  total,
  titles,
}: {
  current: number;
  total: number;
  titles: Record<number, string>;
}) {
  return (
    <ol className="card p-2">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
        const done = n < current;
        const active = n === current;
        return (
          <li
            key={n}
            className="flex items-center gap-3 rounded-lg px-2.5 py-2"
            style={active ? { background: "var(--color-pine-soft)" } : undefined}
          >
            <span
              className="flex h-6 w-6 flex-none items-center justify-center rounded-full font-mono text-[11px]"
              style={
                done || active
                  ? { background: "var(--color-pine)", color: "var(--color-paper)" }
                  : { border: "1px solid var(--color-rule)", color: "var(--color-muted-2)" }
              }
            >
              {done ? <CheckIcon size={12} /> : n}
            </span>
            <span
              className="text-sm"
              style={{
                color: active
                  ? "var(--color-ink)"
                  : done
                    ? "var(--color-muted)"
                    : "var(--color-muted-2)",
                fontWeight: active ? 600 : 400,
              }}
            >
              {titles[n]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
