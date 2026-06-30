"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getScreening,
  listScreeningImages,
  type ScreeningImage,
} from "@/lib/screening/client";
import {
  ScoreRing,
  BandPill,
  TriagePanel,
  AiSlot,
} from "@/components/screening/primitives";
import { PhotoGrid } from "@/components/screening/doctor/PhotoGrid";
import { QuestionnaireSummary } from "@/components/screening/doctor/QuestionnaireSummary";
import { DecisionPanel } from "@/components/screening/doctor/DecisionPanel";
import { OutcomePanel } from "@/components/screening/doctor/OutcomePanel";
import type { Band, FiredFactor } from "@/lib/screening";
import type { OralQuestionnaire } from "@/lib/validators/screening";
import { AppShell } from "@/components/AppShell";

type Patient = {
  id: string;
  name: string;
  age: number;
  gender: string | null;
  mobile: string | null;
};

type Loaded = {
  screening: Record<string, unknown>;
  patient: Patient;
};

function parseReasons(value: unknown): FiredFactor[] {
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as FiredFactor[]) : [];
  } catch {
    return [];
  }
}

function parseQuestionnaire(value: unknown): OralQuestionnaire | null {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value) as OralQuestionnaire;
  } catch {
    return null;
  }
}

export default function CaseDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [data, setData] = useState<Loaded | null>(null);
  const [images, setImages] = useState<ScreeningImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getScreening(id), listScreeningImages(id)])
      .then(([detail, imgs]) => {
        if (cancelled) return;
        setData(detail as Loaded);
        setImages(imgs.images);
      })
      .catch((e) => {
        if (!cancelled)
          setError(
            e instanceof Error ? e.message : "Could not load this screening",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <AppShell>
      <div className="w-full">
        <div className="mb-4">
          <Link href="/screening/queue" className="btn-link text-xs">
            <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
              <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Queue
          </Link>
        </div>

        {loading && <div className="scr-sub">Loading…</div>}
        {error && (
          <div className="scr-sub" style={{ color: "var(--hi-fg)" }}>
            {error}
          </div>
        )}

        {!loading && !error && data && id && (
          <CaseDetail id={id} data={data} images={images} />
        )}
      </div>
    </AppShell>
  );
}

function CaseDetail({
  id,
  data,
  images,
}: {
  id: string;
  data: Loaded;
  images: ScreeningImage[];
}) {
  const { screening: s, patient } = data;

  const band: Band = (s.riskBand as Band) ?? "low";
  const score = typeof s.riskScore === "number" ? (s.riskScore as number) : 0;
  const reasons = parseReasons(s.firedReasons);
  const questionnaire = parseQuestionnaire(s.questionnaire);
  const pathway = typeof s.pathway === "string" ? (s.pathway as string) : "oral";
  const reviewStatus =
    typeof s.reviewStatus === "string" ? (s.reviewStatus as string) : "pending";
  const doctorNotes =
    typeof s.doctorNotes === "string" ? (s.doctorNotes as string) : null;
  const outcome =
    typeof s.outcome === "string" ? (s.outcome as string) : null;
  const outcomeNotes =
    typeof s.outcomeNotes === "string" ? (s.outcomeNotes as string) : null;

  const meta = [`${patient.age} yrs`, patient.gender]
    .filter(Boolean)
    .join(" · ");
  const patientMeta = `${patient.age}/${patient.gender ?? "—"}`;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px] lg:items-start">
      {/* LEFT — clinical decision flow */}
      <div className="flex flex-col gap-5">
        {/* Header: score ring + patient + band */}
        <div
          className="card"
          style={{ padding: 18, display: "flex", alignItems: "center", gap: 16 }}
        >
          <ScoreRing score={score} band={band} size={66} />
          <div style={{ flex: 1 }}>
            <div className="font-display" style={{ fontSize: 20, fontWeight: 500 }}>
              {patient.name}
            </div>
            <div className="scr-sub" style={{ fontSize: 12, marginTop: 2 }}>
              {meta} · {pathway} screening
            </div>
            <div style={{ marginTop: 8 }}>
              <BandPill band={band} />
            </div>
          </div>
        </div>

        {/* Triage / explainability — also on the doctor screen, the key requirement */}
        <TriagePanel band={band} score={score} reasons={reasons} />

        {/* Decision */}
        <DecisionPanel
          screeningId={id}
          patientName={patient.name}
          patientMeta={patientMeta}
          pathway={pathway}
          band={band}
          score={score}
          reasons={reasons}
          initialReviewStatus={reviewStatus}
          initialNotes={doctorNotes}
        />

        {/* Outcome / ground-truth feedback loop */}
        <OutcomePanel
          screeningId={id}
          initialOutcome={outcome}
          initialNotes={outcomeNotes}
        />
      </div>

      {/* RIGHT — the evidence the doctor reviews */}
      <div className="flex flex-col gap-5">
        <PhotoGrid screeningId={id} images={images} />
        <AiSlot />
        {questionnaire ? (
          <QuestionnaireSummary q={questionnaire} />
        ) : (
          <div className="card" style={{ padding: 16 }}>
            <div className="scr-sub">Questionnaire details unavailable.</div>
          </div>
        )}
      </div>
    </div>
  );
}
