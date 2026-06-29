"use client";

import { ConsentRow } from "@/components/screening/primitives";
import { initials } from "./helpers";
import type { QuestionnaireStepProps, SelectedPatient } from "./types";

const labelStyle: React.CSSProperties = {
  font: "600 11px var(--ip-mono), monospace",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--faint)",
  marginBottom: 7,
};

export default function ConsentStep({
  patient,
  questionnaire,
  setQuestionnaire,
}: QuestionnaireStepProps & { patient: SelectedPatient }) {
  const abha = questionnaire.abha ?? "";
  const abhaInvalid = abha.length > 0 && !/^\d{14}$/.test(abha);

  return (
    <div>
      {/* selected-patient mini card */}
      <div
        className="card"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 16px",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            flex: "none",
            borderRadius: "50%",
            background: "var(--tl-50)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            font: "600 14px var(--ip-sans), sans-serif",
            color: "var(--tl)",
          }}
        >
          {initials(patient.name)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ font: "600 15px var(--ip-sans), sans-serif", color: "var(--ink)" }}>
            {patient.name}
          </div>
          <div style={{ font: "400 12px var(--ip-sans), sans-serif", color: "var(--muted)" }}>
            {patient.age} · {patient.gender}
          </div>
        </div>
      </div>

      <div style={{ font: "600 20px var(--ip-sans), sans-serif", color: "var(--ink)" }}>
        Patient consent
      </div>
      <div
        className="card"
        style={{
          padding: 18,
          marginTop: 14,
          font: "400 14px var(--ip-sans), sans-serif",
          color: "var(--ink-2)",
          lineHeight: 1.6,
        }}
      >
        Clinical photographs of the mouth will be captured and stored as part of
        this screening. Images may be reviewed by a clinician and used to support
        a referral decision. No images are shared outside the clinic without
        further consent.
      </div>

      <ConsentRow
        on={questionnaire.consent}
        onChange={(v) => setQuestionnaire((q) => ({ ...q, consent: v }))}
      >
        I have explained the procedure and the patient consents to photographs
        being captured and stored.
      </ConsentRow>

      <div style={{ marginTop: 22 }}>
        <div style={labelStyle}>
          ABHA ID{" "}
          <span style={{ color: "var(--faint)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
            · optional
          </span>
        </div>
        <input
          className="field"
          value={abha}
          inputMode="numeric"
          maxLength={14}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 14);
            setQuestionnaire((q) => ({ ...q, abha: digits || undefined }));
          }}
          placeholder="14-digit ABHA number"
        />
        {abhaInvalid && (
          <div style={{ color: "var(--hi-fg)", fontSize: 12.5, marginTop: 6 }}>
            ABHA must be exactly 14 digits.
          </div>
        )}
      </div>
    </div>
  );
}
