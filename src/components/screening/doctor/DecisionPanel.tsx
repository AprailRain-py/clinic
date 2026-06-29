"use client";

import { useState } from "react";
import Link from "next/link";
import { reviewScreening } from "@/lib/screening/client";
import {
  PrimaryButton,
  CheckIcon,
  DurChipRow,
} from "@/components/screening/primitives";
import type { Band, FiredFactor } from "@/lib/screening";

type DecisionId = "biopsy" | "review" | "clear";

const OUTCOMES: {
  id: DecisionId;
  label: string;
  sub: string;
  reviewStatus: "referred" | "reviewed" | "cleared";
}[] = [
  {
    id: "biopsy",
    label: "Refer for biopsy / specialist",
    sub: "Specialist opinion / histopathology",
    reviewStatus: "referred",
  },
  {
    id: "review",
    label: "Review again after interval",
    sub: "Re-screen this patient after a set interval",
    reviewStatus: "reviewed",
  },
  {
    id: "clear",
    label: "Clear / routine recall",
    sub: "No action now — routine recall",
    reviewStatus: "cleared",
  },
];

const INTERVAL_OPTS = [
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
];

const BAND_LABEL: Record<Band, string> = {
  high: "High",
  moderate: "Moderate",
  low: "Low",
};

function statusToDecision(status: string): DecisionId | null {
  if (status === "referred") return "biopsy";
  if (status === "reviewed") return "review";
  if (status === "cleared") return "clear";
  return null;
}

function buildReferralNote(args: {
  patientName: string;
  patientMeta: string;
  pathway: string;
  band: Band;
  score: number;
  reasons: FiredFactor[];
  decision: DecisionId | null;
  intervalDays: string;
  note: string;
}): string {
  const { patientName, patientMeta, pathway, band, score, reasons } = args;
  const findings = reasons.length
    ? reasons.map((r) => r.reason).join("; ")
    : "No rule-based flags";

  let decisionText = "—";
  if (args.decision === "biopsy")
    decisionText = "REFER for biopsy / specialist opinion";
  else if (args.decision === "review")
    decisionText = `REVIEW again in ${args.intervalDays} days`;
  else if (args.decision === "clear")
    decisionText = "CLEAR — routine recall";

  const lines = [
    `Patient:  ${patientName}  (${patientMeta})`,
    `Pathway:  ${pathway} screening`,
    `Risk:     ${BAND_LABEL[band]}  ·  score ${score}`,
    `Findings: ${findings}`,
    ``,
    `Decision: ${decisionText}`,
  ];
  if (args.note.trim()) lines.push(`Note:     ${args.note.trim()}`);
  return lines.join("\n");
}

/**
 * The doctor's decision section: three triage radios → reviewStatus, an optional
 * review interval, a clinical note, a live referral-note preview, and a save
 * that calls reviewScreening. After saving it shows a done state.
 */
export function DecisionPanel({
  screeningId,
  patientName,
  patientMeta,
  pathway,
  band,
  score,
  reasons,
  initialReviewStatus,
  initialNotes,
}: {
  screeningId: string;
  patientName: string;
  patientMeta: string;
  pathway: string;
  band: Band;
  score: number;
  reasons: FiredFactor[];
  initialReviewStatus?: string;
  initialNotes?: string | null;
}) {
  const [decision, setDecision] = useState<DecisionId | null>(
    initialReviewStatus ? statusToDecision(initialReviewStatus) : null,
  );
  const [intervalDays, setIntervalDays] = useState("7");
  const [note, setNote] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const referralNote = buildReferralNote({
    patientName,
    patientMeta,
    pathway,
    band,
    score,
    reasons,
    decision,
    intervalDays,
    note,
  });

  async function save() {
    const chosen = OUTCOMES.find((o) => o.id === decision);
    if (!chosen) return;
    setSaving(true);
    setError(null);
    try {
      await reviewScreening(screeningId, {
        reviewStatus: chosen.reviewStatus,
        doctorNotes: note.trim() || undefined,
        reviewIntervalDays:
          decision === "review" ? Number(intervalDays) : undefined,
        referralNote,
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save decision");
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div
        className="card"
        style={{
          padding: 24,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "var(--tl-50)",
            border: "1.5px solid var(--tl-100)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--tl)",
          }}
        >
          <CheckIcon size={32} />
        </div>
        <div style={{ fontWeight: 700, fontSize: 20, marginTop: 16 }}>
          Decision saved
        </div>
        <div className="scr-sub" style={{ marginTop: 6 }}>
          Referral note generated for {patientName}.
        </div>
        <pre
          style={{
            width: "100%",
            margin: "20px 0 0",
            textAlign: "left",
            background: "var(--ink)",
            color: "#cfe9e3",
            borderRadius: 13,
            padding: 16,
            font: "500 11px var(--ip-mono), monospace",
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {referralNote}
        </pre>
        <div style={{ width: "100%", marginTop: 18 }}>
          <Link
            href="/screening/queue"
            style={{ textDecoration: "none", display: "block", width: "100%" }}
          >
            <span className="btn-primary" style={{ display: "flex" }}>
              Back to queue
            </span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 10 }}>
          Decision
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {OUTCOMES.map((o) => {
            const on = decision === o.id;
            return (
              <div
                key={o.id}
                className={`oc ${o.id}${on ? " on" : ""}`}
                onClick={() => setDecision(o.id)}
              >
                <div className="oc-dot">{on && <CheckIcon size={13} />}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{o.label}</div>
                  <div className="scr-sub" style={{ fontSize: 12, marginTop: 1 }}>
                    {o.sub}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {decision === "review" && (
        <div>
          <div className="eyebrow" style={{ marginBottom: 10 }}>
            Review interval
          </div>
          <DurChipRow
            options={INTERVAL_OPTS}
            value={intervalDays}
            onChange={setIntervalDays}
          />
        </div>
      )}

      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          Clinical note
          <span className="ml-2 font-mono text-[10px] normal-case tracking-normal text-[--color-muted-2]">
            optional
          </span>
        </div>
        <textarea
          className="field"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Type your note here…"
          style={{ minHeight: 96, resize: "none", lineHeight: 1.5 }}
        />
        <p className="mt-2 text-xs text-[--color-muted]">
          A referral note is generated automatically from the decision when you save.
        </p>
      </div>

      {error && (
        <div
          className="scr-sub"
          style={{ color: "var(--hi-fg)", fontWeight: 500 }}
        >
          {error}
        </div>
      )}

      <PrimaryButton disabled={!decision || saving} onClick={save}>
        {saving ? "Saving…" : "Save decision"}
      </PrimaryButton>
    </div>
  );
}
