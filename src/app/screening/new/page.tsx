"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PrimaryButton, ProgressBar } from "@/components/screening/primitives";
import {
  LiveTriageBadge,
  LiveTriagePanel,
  SidebarPatient,
  Stepper,
} from "@/components/screening/ma/StepKit";
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
  7: "Review & submit",
};
const FOOTER_LABELS: Record<number, string> = {
  1: "Continue",
  2: "Continue",
  3: "Continue",
  4: "Continue",
  5: "Continue to photos",
  7: "Submit to doctor's queue",
};

function NewScreeningFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdParam = searchParams.get("patientId");
  const firstStep = patientIdParam ? 2 : 1;

  const [step, setStep] = useState(firstStep);
  const [patient, setPatient] = useState<SelectedPatient | null>(null);
  const [screeningId, setScreeningId] = useState<string | null>(null);
  const [questionnaire, setQuestionnaire] = useState<OralQuestionnaire>(
    initialQuestionnaire,
  );
  const [captured, setCaptured] = useState<CapturedMap>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefilling, setPrefilling] = useState<boolean>(!!patientIdParam);

  useEffect(() => {
    if (!patientIdParam) return;
    let cancelled = false;
    setPrefilling(true);
    fetch(`/api/patients/${patientIdParam}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not_found"))))
      .then(
        (res: {
          patient: { id: string; name: string; age: number; gender: string | null };
        }) => {
          if (cancelled) return;
          setPatient({
            patientId: res.patient.id,
            name: res.patient.name,
            age: res.patient.age,
            gender: res.patient.gender ?? "",
          });
        },
      )
      .catch(() => {
        if (cancelled) return;
        setError("Could not load that patient — please select one.");
        setStep(1);
      })
      .finally(() => {
        if (!cancelled) setPrefilling(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patientIdParam]);

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
    if (step <= firstStep) {
      router.push(patientIdParam ? `/patients/${patientIdParam}` : "/screening");
      return;
    }
    setStep((s) => s - 1);
  }

  function reset() {
    setStep(firstStep);
    if (!patientIdParam) setPatient(null);
    setScreeningId(null);
    setQuestionnaire(initialQuestionnaire());
    setCaptured({});
    setError(null);
  }

  // ----- submitted (terminal) -----
  if (step === 8 && patient && result) {
    return (
      <AppShell>
        <SubmittedStep patient={patient} band={result.band} score={result.score} onNew={reset} />
      </AppShell>
    );
  }

  const showSidebar = step >= 2; // patient context exists from consent onward

  return (
    <AppShell>
      <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-10">
        {/* desktop context sidebar */}
        <aside className="hidden space-y-4 lg:sticky lg:top-6 lg:block">
          {patient ? (
            <SidebarPatient name={patient.name} age={patient.age} gender={patient.gender} />
          ) : null}
          {result && showSidebar && step >= 3 ? (
            <LiveTriagePanel band={result.band} score={result.score} reasons={result.firedReasons} />
          ) : null}
          <Stepper current={step} total={TOTAL} titles={TITLES} />
        </aside>

        {/* main content */}
        <div className="min-w-0">
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <button type="button" onClick={back} className="btn-link text-xs" aria-label="Back">
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
                  <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Back
              </button>
              <h1 className="font-display text-xl font-medium md:text-2xl">{TITLES[step]}</h1>
              <div className="flex-1" />
              <span className="font-mono text-xs text-[--color-muted] lg:hidden">
                Step {step} of {TOTAL}
              </span>
            </div>
            {/* compact progress + live read-out on tablet/mobile (sidebar carries it on desktop) */}
            <div className="mt-3 lg:hidden">
              <ProgressBar step={step} total={TOTAL} />
            </div>
            {result && step >= 3 ? (
              <div className="mt-4 lg:hidden">
                <LiveTriageBadge band={result.band} topReason={result.firedReasons.find((r) => r.tier)?.reason} />
              </div>
            ) : null}
          </div>

          {prefilling ? (
            <div className="scr-sub">Loading patient…</div>
          ) : step === 6 ? (
            screeningId ? (
              <div
                className="flex flex-col overflow-hidden rounded-2xl border border-[--color-rule]"
                style={{ height: "min(72vh, 640px)" }}
              >
                <CaptureStep
                  screeningId={screeningId}
                  views={views}
                  captured={captured}
                  setCaptured={setCaptured}
                  onReview={() => setStep(7)}
                />
              </div>
            ) : (
              <div className="scr-sub">Screening draft missing — go back and re-confirm consent.</div>
            )
          ) : (
            <div>
              {step === 1 && (
                <PatientStep
                  onPicked={(p) => {
                    setPatient(p);
                    setStep(2);
                  }}
                />
              )}
              {step === 2 && patient && (
                <ConsentStep patient={patient} questionnaire={questionnaire} setQuestionnaire={setQuestionnaire} />
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
                  views={views}
                  captured={captured}
                  capturedCount={capturedCount}
                  totalViews={views.length}
                />
              )}
            </div>
          )}

          {/* footer */}
          {step !== 1 && step !== 6 && !prefilling ? (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              {error ? (
                <p className="text-sm text-[--color-rust] sm:mr-auto">{error}</p>
              ) : null}
              <div className="w-full sm:w-60">
                <PrimaryButton disabled={!canAdvance || busy} onClick={next}>
                  {busy ? "Working…" : FOOTER_LABELS[step]}
                </PrimaryButton>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

export default function NewScreeningPage() {
  return (
    <Suspense fallback={null}>
      <NewScreeningFlow />
    </Suspense>
  );
}
