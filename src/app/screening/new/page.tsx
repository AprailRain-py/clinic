"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton, ProgressBar } from "@/components/screening/primitives";
import CaptureStep from "@/components/screening/ma/CaptureStep";
import ConsentStep from "@/components/screening/ma/ConsentStep";
import ExamStep from "@/components/screening/ma/ExamStep";
import PatientStep from "@/components/screening/ma/PatientStep";
import ReviewStep from "@/components/screening/ma/ReviewStep";
import RiskStep from "@/components/screening/ma/RiskStep";
import SubmittedStep from "@/components/screening/ma/SubmittedStep";
import SymptomsStep from "@/components/screening/ma/SymptomsStep";
import {
  applicableViews,
  initialQuestionnaire,
  todayISO,
} from "@/components/screening/ma/helpers";
import type {
  CapturedMap,
  SelectedPatient,
} from "@/components/screening/ma/types";
import { evaluateOral } from "@/lib/screening";
import { createScreeningDraft, finalizeScreening } from "@/lib/screening/client";
import type { OralQuestionnaire } from "@/lib/validators/screening";

const TOTAL = 7;
const TITLES: Record<number, string> = {
  1: "Select patient",
  2: "Consent",
  3: "Risk factors",
  4: "Symptoms",
  5: "Exam findings",
  6: "Capture photos",
  7: "Review",
};
const FOOTER_LABELS: Record<number, string> = {
  1: "Continue",
  2: "Continue",
  3: "Continue",
  4: "Continue",
  5: "Continue to photos",
  7: "Submit to doctor's queue",
};

export default function NewScreeningPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [patient, setPatient] = useState<SelectedPatient | null>(null);
  const [screeningId, setScreeningId] = useState<string | null>(null);
  const [questionnaire, setQuestionnaire] = useState<OralQuestionnaire>(
    initialQuestionnaire,
  );
  const [captured, setCaptured] = useState<CapturedMap>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const views = useMemo(() => applicableViews(questionnaire), [questionnaire]);
  const capturedCount = views.filter((v) => captured[v.id]).length;

  const result = useMemo(
    () =>
      patient
        ? evaluateOral({
            age: patient.age,
            riskFactors: questionnaire.riskFactors,
            symptoms: questionnaire.symptoms,
            lesions: questionnaire.lesions,
          })
        : null,
    [patient, questionnaire],
  );

  // ----- per-step gating -----
  const abhaOk = !questionnaire.abha || /^\d{14}$/.test(questionnaire.abha);
  const symptomsValid =
    !(questionnaire.symptoms.nonHealingLesion && questionnaire.symptoms.lesionDuration == null) &&
    !(questionnaire.symptoms.difficultyOpening && questionnaire.symptoms.mouthOpeningMm == null);

  let canAdvance = true;
  if (step === 1) canAdvance = !!patient;
  else if (step === 2) canAdvance = questionnaire.consent && abhaOk;
  else if (step === 4) canAdvance = symptomsValid;
  else if (step === 7) canAdvance = !!screeningId;

  async function next() {
    if (busy) return;
    setError(null);

    if (step === 2) {
      if (!patient) return;
      if (!screeningId) {
        setBusy(true);
        try {
          const { screeningId: id } = await createScreeningDraft(patient.patientId);
          setScreeningId(id);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not start the screening draft.");
          setBusy(false);
          return;
        }
        setBusy(false);
      }
      setStep(3);
      return;
    }

    if (step === 7) {
      if (!screeningId) return;
      setBusy(true);
      try {
        await finalizeScreening(screeningId, questionnaire, todayISO());
        setStep(8);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not submit — please retry.");
      } finally {
        setBusy(false);
      }
      return;
    }

    setStep((s) => Math.min(TOTAL, s + 1));
  }

  function back() {
    setError(null);
    if (step <= 1) {
      router.push("/screening");
      return;
    }
    setStep((s) => s - 1);
  }

  function reset() {
    setStep(1);
    setPatient(null);
    setScreeningId(null);
    setQuestionnaire(initialQuestionnaire());
    setCaptured({});
    setError(null);
  }

  // ----- submitted (terminal) -----
  if (step === 8 && patient && result) {
    return (
      <Shell>
        <SubmittedStep patient={patient} band={result.band} score={result.score} onNew={reset} />
      </Shell>
    );
  }

  return (
    <Shell>
      {/* header */}
      <div style={{ flex: "none", background: "#fff", borderBottom: "1px solid var(--line)" }}>
        <div style={{ height: 54, display: "flex", alignItems: "center", gap: 4, padding: "0 10px 0 6px" }}>
          <button
            type="button"
            onClick={back}
            aria-label="Back"
            style={{
              width: 42,
              height: 42,
              flex: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "none",
              border: "none",
              cursor: "pointer",
              borderRadius: 12,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div style={{ font: "600 17px var(--ip-sans), sans-serif", color: "var(--ink)" }}>
            {TITLES[step]}
          </div>
          <div style={{ flex: 1 }} />
          <span className="mono" style={{ font: "500 12px var(--ip-mono), monospace", color: "var(--faint)", margin: "0 10px 0 8px" }}>
            Step {step} of {TOTAL}
          </span>
        </div>
        <ProgressBar step={step} total={TOTAL} />
      </div>

      {/* body */}
      {step === 6 ? (
        screeningId ? (
          <CaptureStep
            screeningId={screeningId}
            views={views}
            captured={captured}
            setCaptured={setCaptured}
            onReview={() => setStep(7)}
          />
        ) : (
          <div style={{ flex: 1, padding: 18, color: "var(--muted)" }}>
            Screening draft missing — go back and re-confirm consent.
          </div>
        )
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: 18, minHeight: 0 }}>
          {step === 1 && <PatientStep selected={patient} onSelect={setPatient} />}
          {step === 2 && patient && (
            <ConsentStep
              patient={patient}
              questionnaire={questionnaire}
              setQuestionnaire={setQuestionnaire}
            />
          )}
          {step === 3 && (
            <RiskStep questionnaire={questionnaire} setQuestionnaire={setQuestionnaire} />
          )}
          {step === 4 && (
            <SymptomsStep
              questionnaire={questionnaire}
              setQuestionnaire={setQuestionnaire}
              firedReasons={result?.firedReasons ?? []}
            />
          )}
          {step === 5 && (
            <ExamStep questionnaire={questionnaire} setQuestionnaire={setQuestionnaire} />
          )}
          {step === 7 && patient && result && (
            <ReviewStep
              patient={patient}
              questionnaire={questionnaire}
              result={result}
              capturedCount={capturedCount}
              totalViews={views.length}
            />
          )}
        </div>
      )}

      {/* footer (sticky); the capture step renders its own controls */}
      {step !== 6 && (
        <div style={{ flex: "none", background: "#fff", borderTop: "1px solid var(--line)", padding: "14px 18px 18px" }}>
          {error && (
            <div style={{ color: "var(--hi-fg)", fontSize: 13, marginBottom: 10 }}>{error}</div>
          )}
          <PrimaryButton disabled={!canAdvance || busy} onClick={next}>
            {busy ? "Working…" : FOOTER_LABELS[step]}
          </PrimaryButton>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", justifyContent: "center", background: "var(--screen)" }}>
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          minHeight: "100dvh",
          height: "100dvh",
          display: "flex",
          flexDirection: "column",
          background: "var(--screen)",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
}
