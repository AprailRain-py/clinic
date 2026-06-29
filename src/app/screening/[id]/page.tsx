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
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "18px 18px 48px" }}>
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/screening/queue"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            textDecoration: "none",
            color: "var(--muted)",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
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
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Header: score ring + patient + band */}
      <div
        className="card"
        style={{
          padding: 18,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <ScoreRing score={score} band={band} size={66} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{patient.name}</div>
          <div className="scr-sub" style={{ fontSize: 12, marginTop: 2 }}>
            {meta} · {pathway} screening
          </div>
          <div style={{ marginTop: 8 }}>
            <BandPill band={band} />
          </div>
        </div>
      </div>

      {/* Triage / explainability — the key requirement, also on the doctor screen */}
      <TriagePanel band={band} score={score} reasons={reasons} />

      {/* Reserved AI image-score slot */}
      <AiSlot />

      {/* Photo grid (opens zoom overlay with the AI heatmap slot) */}
      <PhotoGrid screeningId={id} images={images} />

      {/* Risk factors + symptoms summary */}
      {questionnaire ? (
        <QuestionnaireSummary q={questionnaire} />
      ) : (
        <div className="card" style={{ padding: 16 }}>
          <div className="scr-sub">Questionnaire details unavailable.</div>
        </div>
      )}

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
  );
}
