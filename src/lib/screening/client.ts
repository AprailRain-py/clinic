// Browser-side API client for the screening endpoints. Thin typed fetch
// wrappers used by the 'use client' screens.

import type {
  OralQuestionnaire,
  ScreeningOutcome,
} from "@/lib/validators/screening";

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `http_${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function createScreeningDraft(
  patientId: string,
  pathway: "oral" | "skin" = "oral",
): Promise<{ screeningId: string }> {
  const res = await fetch("/api/screenings/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patientId, pathway }),
  });
  return jsonOrThrow(res);
}

export type ScreeningImage = {
  id: string;
  viewType: string;
  mimeType: string;
  sizeBytes: number;
  qualityCheck: string | null;
  position: number;
  createdAt: number;
};

export async function uploadScreeningImage(
  screeningId: string,
  viewType: string,
  file: Blob,
  qualityCheck?: unknown,
): Promise<ScreeningImage> {
  const form = new FormData();
  form.set("viewType", viewType);
  form.set("file", file, `${viewType}.jpg`);
  if (qualityCheck != null) form.set("qualityCheck", JSON.stringify(qualityCheck));
  const res = await fetch(`/api/screenings/${screeningId}/images`, {
    method: "POST",
    body: form,
  });
  return jsonOrThrow(res);
}

export async function listScreeningImages(
  screeningId: string,
): Promise<{ images: ScreeningImage[] }> {
  return jsonOrThrow(await fetch(`/api/screenings/${screeningId}/images`));
}

export function screeningImageUrl(screeningId: string, imageId: string): string {
  return `/api/screenings/${screeningId}/images/${imageId}`;
}

export async function finalizeScreening(
  screeningId: string,
  questionnaire: OralQuestionnaire,
  screeningDate?: string,
) {
  const res = await fetch(`/api/screenings/${screeningId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questionnaire, screeningDate }),
  });
  return jsonOrThrow(res);
}

export type QueueRow = {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string | null;
  pathway: string;
  screeningDate: string;
  riskScore: number | null;
  riskBand: "low" | "moderate" | "high" | null;
  triageTier: string | null;
  firedReasons: string | null;
  reviewStatus: string;
  outcome: string | null;
  createdAt: number;
};

export async function listQueue(
  status?: string,
): Promise<{ screenings: QueueRow[]; counts: { high: number; moderate: number; low: number } }> {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return jsonOrThrow(await fetch(`/api/screenings${q}`));
}

export async function getScreening(id: string): Promise<{
  screening: Record<string, unknown>;
  patient: { id: string; name: string; age: number; gender: string | null; mobile: string | null };
}> {
  return jsonOrThrow(await fetch(`/api/screenings/${id}`));
}

export async function reviewScreening(
  id: string,
  payload: {
    reviewStatus: "reviewed" | "referred" | "cleared";
    doctorNotes?: string;
    reviewIntervalDays?: number;
    referralNote?: string;
  },
) {
  const res = await fetch(`/api/screenings/${id}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return jsonOrThrow(res);
}

export async function recordOutcome(
  id: string,
  payload: { outcome: ScreeningOutcome; outcomeNotes?: string; outcomeDate?: string },
) {
  const res = await fetch(`/api/screenings/${id}/outcome`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return jsonOrThrow(res);
}
