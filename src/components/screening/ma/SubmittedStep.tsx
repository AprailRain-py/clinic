"use client";

import { useRouter } from "next/navigation";
import type { Band } from "@/lib/screening";
import type { SelectedPatient } from "./types";

const BAND_LABEL: Record<Band, string> = {
  high: "High",
  moderate: "Moderate",
  low: "Low",
};
const BAND_VARS: Record<Band, { bg: string; bd: string; fg: string }> = {
  high: { bg: "var(--hi-bg)", bd: "var(--hi-bd)", fg: "var(--hi-fg)" },
  moderate: { bg: "var(--md-bg)", bd: "var(--md-bd)", fg: "var(--md-fg)" },
  low: { bg: "var(--lo-bg)", bd: "var(--lo-bd)", fg: "var(--lo-fg)" },
};

export default function SubmittedStep({
  patient,
  band,
  score,
  onNew,
}: {
  patient: SelectedPatient;
  band: Band;
  score: number;
  onNew: () => void;
}) {
  const router = useRouter();
  const v = BAND_VARS[band];

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: 32,
        background: "var(--screen)",
      }}
    >
      <div
        style={{
          width: 88,
          height: 88,
          borderRadius: "50%",
          background: "var(--tl-50)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1.5px solid var(--tl-100)",
        }}
      >
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--tl)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <div style={{ font: "700 23px var(--ip-sans), sans-serif", color: "var(--ink)", marginTop: 22 }}>
        Sent to doctor&rsquo;s queue
      </div>
      <div
        style={{
          font: "400 14px var(--ip-sans), sans-serif",
          color: "var(--muted)",
          marginTop: 6,
          lineHeight: 1.5,
          maxWidth: 280,
        }}
      >
        Screening for{" "}
        <span style={{ fontWeight: 600, color: "var(--ink)" }}>{patient.name}</span> has been
        submitted for review.
      </div>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 9,
          marginTop: 18,
          padding: "9px 15px",
          borderRadius: 11,
          background: v.bg,
          border: `1px solid ${v.bd}`,
        }}
      >
        <span style={{ font: "600 13px var(--ip-sans), sans-serif", color: v.fg }}>
          {BAND_LABEL[band]} risk · score {score}
        </span>
      </div>

      <div style={{ width: "100%", maxWidth: 300, marginTop: 34, display: "flex", flexDirection: "column", gap: 11 }}>
        <button
          type="button"
          className="btn-primary"
          onClick={onNew}
        >
          Start new screening
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => router.push("/screening/queue")}
        >
          Open doctor&rsquo;s queue
        </button>
      </div>
    </div>
  );
}
