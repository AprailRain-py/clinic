"use client";

import type { Band, FiredFactor, Tier } from "@/lib/screening";

// ---- small inline icons ----
export function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12.5l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---- buttons / tabs ----
export function PrimaryButton({
  children,
  disabled,
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      className={`btn-primary${disabled ? " off" : ""}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button type="button" className="btn-ghost" onClick={onClick}>
      {children}
    </button>
  );
}

export function SegTab({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={`seg-tab${on ? " on" : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

// ---- chips ----
export function Chip({
  on,
  onClick,
  sex,
  children,
}: {
  on: boolean;
  onClick?: () => void;
  sex?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`chip${sex ? " sex" : ""}${on ? " on" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function DurChipRow({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`durchip${value === o.value ? " on" : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---- switch / consent ----
export function Switch({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className={`sw-track${on ? " on" : ""}`}
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
    >
      <div className="sw-knob" />
    </div>
  );
}

export function ConsentRow({
  on,
  onChange,
  children,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`consent-row${on ? " on" : ""}`} onClick={() => onChange(!on)}>
      <div className={`consent-box${on ? " on" : ""}`}>{on && <CheckIcon />}</div>
      <div style={{ fontSize: 14, lineHeight: 1.5, color: "var(--ink-2)" }}>
        {children}
      </div>
    </div>
  );
}

// ---- symptom row ----
export function SymptomRow({
  label,
  on,
  fired,
  onToggle,
  children,
}: {
  label: string;
  on: boolean;
  fired?: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className={`sym-row${fired ? " fired" : on ? " on" : ""}`}>
      <div
        style={{ display: "flex", alignItems: "center", gap: 13, cursor: "pointer" }}
        onClick={onToggle}
      >
        <div className={`sym-box${fired ? " fired" : on ? " on" : ""}`}>
          {on && <CheckIcon />}
        </div>
        <span style={{ fontSize: 15, fontWeight: 500, flex: 1 }}>{label}</span>
        {fired && (
          <span
            className="mono"
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "var(--hi-fg)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Refer
          </span>
        )}
      </div>
      {on && children && <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  );
}

// ---- triage primitives ----
const BAND_LABEL: Record<Band, string> = {
  high: "High risk",
  moderate: "Moderate",
  low: "Low risk",
};

export function BandPill({ band }: { band: Band }) {
  return <span className={`bandpill ${band}`}>{BAND_LABEL[band]}</span>;
}

export function ScoreRing({
  score,
  band,
  size = 76,
}: {
  score: number;
  band: Band;
  size?: number;
}) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const color =
    band === "high" ? "var(--hi-fg)" : band === "moderate" ? "var(--md-fg)" : "var(--lo-fg)";
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e6ecec" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span className="mono" style={{ fontWeight: 700, fontSize: 20, color }}>
          {score}
        </span>
        <span className="mono" style={{ fontSize: 8, letterSpacing: "0.1em", color: "var(--muted)" }}>
          SCORE
        </span>
      </div>
    </div>
  );
}

const TIER_META: Record<Tier, { color: string; tag: string }> = {
  RED: { color: "var(--hi-fg)", tag: "RED FLAG" },
  AMBER: { color: "var(--md-fg)", tag: "WATCH" },
  YELLOW: { color: "var(--md-fg)", tag: "RISK" },
  GREEN: { color: "var(--lo-fg)", tag: "" },
};

// The explainable panel: band + the exact reasons that fired. Used on the MA
// review screen AND the doctor case detail.
export function TriagePanel({
  band,
  score,
  reasons,
}: {
  band: Band;
  score: number;
  reasons: FiredFactor[];
}) {
  const tiered = reasons.filter((r) => r.tier);
  const modifiers = reasons.filter((r) => !r.tier);
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <ScoreRing score={score} band={band} />
        <div>
          <BandPill band={band} />
          <div className="scr-sub" style={{ marginTop: 6 }}>
            Rule-based · AI image score coming later
          </div>
        </div>
      </div>
      <div className="eyebrow" style={{ marginTop: 16 }}>
        Why this band fired
      </div>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 9 }}>
        {tiered.length === 0 && (
          <div className="scr-sub">No clinical red flags — see risk modifiers below.</div>
        )}
        {tiered.map((r) => (
          <ReasonRow key={r.id} reason={r} />
        ))}
        {modifiers.map((r) => (
          <ReasonRow key={r.id} reason={r} />
        ))}
      </div>
    </div>
  );
}

function ReasonRow({ reason }: { reason: FiredFactor }) {
  const meta = reason.tier ? TIER_META[reason.tier] : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: meta?.color ?? "var(--muted)",
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 14, flex: 1 }}>{reason.reason}</span>
      {meta?.tag && (
        <span
          className="mono"
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: meta.color,
            letterSpacing: "0.06em",
          }}
        >
          {meta.tag}
        </span>
      )}
    </div>
  );
}

// The reserved, clearly-disabled AI slot — present in the layout, never faking
// a result. Used in the doctor case detail and the photo zoom.
export function AiSlot({
  title = "AI image score",
  caption = "Will rank lesion suspicion from the captured photos. Reserved here — disabled until the model is validated.",
}: {
  title?: string;
  caption?: string;
}) {
  return (
    <div className="ai-slot">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 600, fontSize: 14, color: "var(--muted)" }}>{title}</span>
        <span className="ai-pill">Not yet enabled</span>
      </div>
      <div className="scr-sub" style={{ marginTop: 8, fontSize: 12.5 }}>
        {caption}
      </div>
    </div>
  );
}

export function LiveQualityPill({
  state,
}: {
  state: "ok" | "blurry" | "dark";
}) {
  const map = {
    ok: { dot: "#a6f4c5", label: "Sharp · well-lit" },
    blurry: { dot: "#fca5a5", label: "Too blurry — move closer & steady" },
    dark: { dot: "#fedf89", label: "Too dark — add more light" },
  } as const;
  const m = map[state];
  return (
    <span className="lqpill">
      <span className="lqdot" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
}

export function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="progtrack">
      <div className="prog" style={{ width: `${(step / total) * 100}%` }} />
    </div>
  );
}
