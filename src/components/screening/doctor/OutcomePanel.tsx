"use client";

import { useState } from "react";
import { recordOutcome } from "@/lib/screening/client";
import { PrimaryButton } from "@/components/screening/primitives";
import type { ScreeningOutcome } from "@/lib/validators/screening";

const OUTCOME_OPTIONS: { value: ScreeningOutcome; label: string }[] = [
  { value: "referred_biopsy_pending", label: "Referred — biopsy pending" },
  { value: "biopsy_benign", label: "Biopsy result — benign" },
  { value: "biopsy_dysplasia", label: "Biopsy result — dysplasia" },
  { value: "biopsy_oscc_cancer", label: "Biopsy result — OSCC / cancer" },
  { value: "not_biopsied", label: "Not biopsied" },
  { value: "lost_to_followup", label: "Lost to follow-up" },
];

/**
 * Ground-truth / feedback-loop capture. The recorded biopsy outcome is the label
 * the future AI image model will be trained and validated against.
 */
export function OutcomePanel({
  screeningId,
  initialOutcome,
  initialNotes,
}: {
  screeningId: string;
  initialOutcome?: string | null;
  initialNotes?: string | null;
}) {
  const [outcome, setOutcome] = useState<string>(initialOutcome ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!outcome) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await recordOutcome(screeningId, {
        outcome: outcome as ScreeningOutcome,
        outcomeNotes: notes.trim() || undefined,
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save outcome");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 4 }}>
        Outcome · ground truth
      </div>
      <div className="scr-sub" style={{ marginBottom: 12, fontSize: 12.5 }}>
        Records the biopsy / follow-up result. This is the feedback loop — the
        label the AI image model is later validated against.
      </div>

      <div className="card" style={{ padding: 16 }}>
        <select
          className="field"
          value={outcome}
          onChange={(e) => {
            setOutcome(e.target.value);
            setSaved(false);
          }}
        >
          <option value="">Select an outcome…</option>
          {OUTCOME_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <textarea
          className="field"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
          }}
          placeholder="Outcome notes (optional)…"
          style={{ minHeight: 72, resize: "none", lineHeight: 1.5, marginTop: 12 }}
        />

        {error && (
          <div
            className="scr-sub"
            style={{ color: "var(--hi-fg)", fontWeight: 500, marginTop: 12 }}
          >
            {error}
          </div>
        )}
        {saved && (
          <div
            className="scr-sub"
            style={{ color: "var(--lo-fg)", fontWeight: 500, marginTop: 12 }}
          >
            Outcome recorded.
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <PrimaryButton disabled={!outcome || saving} onClick={save}>
            {saving ? "Saving…" : "Record outcome"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
