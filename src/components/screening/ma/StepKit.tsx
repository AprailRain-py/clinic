"use client";

import type { Band } from "@/lib/screening";
import type { Opt } from "@/lib/screening/oral-form";

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
