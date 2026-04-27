import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { patients, visitImages, visits } from "@/lib/db/schema";
import {
  describeDosing,
  MEAL_TIMING_LABELS,
  normalizeItem,
} from "@/components/prescription-editor/dosing";
import type { PrescriptionDocument } from "@/components/prescription-editor/types";
import { parseConditions } from "@/lib/conditions";
import { ConditionChip } from "@/components/ConditionChip";
import { getDoctorProfile } from "@/lib/db/doctor";
import { PhotoAttacher, type ImageMeta } from "@/components/PhotoAttacher";

export const dynamic = "force-dynamic";

type Params = { id: string; visitId: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const session = await auth();
  if (!session?.user?.id) return { title: "Visit · Arthik Clinic" };
  const { id, visitId } = await params;

  const [row] = await db
    .select({
      visitDate: visits.visitDate,
      patientName: patients.name,
    })
    .from(visits)
    .innerJoin(patients, eq(visits.patientId, patients.id))
    .where(
      and(
        eq(visits.id, visitId),
        eq(patients.id, id),
        eq(patients.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!row) return { title: "Visit · Arthik Clinic" };
  const firstName = row.patientName.split(" ")[0] ?? row.patientName;
  return {
    title: `Visit ${row.visitDate} · ${firstName} · Arthik Clinic`,
  };
}

function parsePrescription(raw: string): PrescriptionDocument {
  try {
    const parsed = JSON.parse(raw);
    return {
      items: Array.isArray(parsed?.items) ? parsed.items : [],
      freeText: typeof parsed?.freeText === "string" ? parsed.freeText : "",
    };
  } catch {
    return { items: [], freeText: "" };
  }
}

export default async function VisitPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id, visitId } = await params;

  const [row] = await db
    .select({ visit: visits, patient: patients })
    .from(visits)
    .innerJoin(patients, eq(visits.patientId, patients.id))
    .where(
      and(
        eq(visits.id, visitId),
        eq(patients.id, id),
        eq(patients.userId, session.user.id),
      ),
    )
    .limit(1);

  if (!row) notFound();

  const doc = parsePrescription(row.visit.prescription);
  const conditions = parseConditions(row.patient.conditions);
  const doctorProfile = await getDoctorProfile(session.user.id);
  const clinicName = doctorProfile?.clinicName ?? "Your Clinic";

  const imageRows: ImageMeta[] = await db
    .select({
      id: visitImages.id,
      mimeType: visitImages.mimeType,
      sizeBytes: visitImages.sizeBytes,
      position: visitImages.position,
      createdAt: visitImages.createdAt,
    })
    .from(visitImages)
    .where(
      and(
        eq(visitImages.visitId, row.visit.id),
        eq(visitImages.userId, session.user.id),
      ),
    )
    .orderBy(asc(visitImages.position), asc(visitImages.id));

  return (
    <div className="min-h-screen">
      <header className="container-shell flex items-center justify-between py-6">
        <Link href={`/patients/${row.patient.id}`} className="btn-link">
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to {row.patient.name.split(" ")[0]}
        </Link>
        <span className="eyebrow font-mono" data-testid="visit-eyebrow">
          Visit · {row.visit.visitDate} ·{" "}
          {row.patient.name.split(" ")[0]}
        </span>
      </header>

      <main className="container-shell pb-20">
        <div className="mx-auto max-w-3xl">
          {/* Prescription document — a sheet */}
          <article className="reveal card relative overflow-hidden p-10 md:p-14">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-8 top-4 h-px bg-[--color-rule]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-8 bottom-4 h-px bg-[--color-rule]"
            />

            {/* Header */}
            <div className="mb-8 flex items-baseline justify-between border-b border-[--color-rule] pb-6">
              <div>
                <div className="eyebrow">Prescription</div>
                <div className="mt-1 font-display text-[22px] font-medium">
                  {clinicName}
                </div>
              </div>
              <div className="text-right">
                <div className="eyebrow">Dated</div>
                <div className="font-mono text-sm tabular-nums">
                  {row.visit.visitDate}
                </div>
              </div>
            </div>

            {/* Patient block */}
            <div className="mb-8 grid gap-4 md:grid-cols-[1fr_auto]">
              <div>
                <div className="eyebrow">Patient</div>
                <h1 className="font-display mt-1 text-[clamp(1.75rem,3vw,2.25rem)] font-medium leading-tight">
                  {row.patient.name}
                </h1>
                {conditions.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {conditions.map((slug) => (
                      <ConditionChip key={slug} slug={slug} size="sm" />
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="text-right">
                <div className="eyebrow">Age</div>
                <div className="font-display text-3xl font-medium tabular-nums">
                  {row.patient.age}
                </div>
              </div>
            </div>

            {doc.freeText ? (
              <section className="mb-10">
                <div className="eyebrow mb-3">Notes</div>
                <p className="whitespace-pre-wrap font-display text-[17px] leading-relaxed text-[--color-ink-soft]">
                  {doc.freeText}
                </p>
              </section>
            ) : null}

            <section>
              <div className="mb-4 flex items-baseline justify-between border-b border-[--color-rule] pb-2">
                <div className="eyebrow">Medications</div>
                <span className="font-mono text-xs text-[--color-muted]">
                  {doc.items.length} {doc.items.length === 1 ? "item" : "items"}
                </span>
              </div>

              {doc.items.length === 0 ? (
                <p className="text-[--color-muted]">
                  No medicines prescribed.
                </p>
              ) : (
                <ol className="space-y-5">
                  {doc.items.map((rawIt, idx) => {
                    const it = normalizeItem(rawIt);
                    const mealLabel =
                      it.mealTiming && it.mealTiming !== null
                        ? MEAL_TIMING_LABELS[it.mealTiming]
                        : null;
                    return (
                      <li
                        key={idx}
                        className="grid grid-cols-[auto_1fr_auto] gap-5"
                      >
                        <span className="font-mono text-xs text-[--color-muted-2] tabular-nums pt-1.5">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <div className="flex items-baseline gap-3">
                            <span className="font-display text-xl font-medium">
                              {it.brand}
                            </span>
                            {it.strength ? (
                              <span className="font-mono text-sm font-semibold text-[--color-ink]">
                                {it.strength}
                              </span>
                            ) : null}
                            {it.form ? (
                              <span className="chip px-2.5 py-0.5 text-xs font-semibold">
                                {it.form}
                              </span>
                            ) : null}
                          </div>
                          {it.generic || it.composition ? (
                            <div className="mt-0.5 text-sm text-[--color-muted]">
                              {it.generic ?? it.composition}
                            </div>
                          ) : null}
                          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                            <span className="chip chip-pine">
                              {describeDosing(it)}
                            </span>
                            <span className="font-mono text-xs">
                              <span className="text-[--color-muted]">
                                Duration ·{" "}
                              </span>
                              {it.durationDays}d
                            </span>
                            {mealLabel ? (
                              <span className="font-mono text-xs">
                                <span className="text-[--color-muted]">
                                  With meal ·{" "}
                                </span>
                                {mealLabel}
                              </span>
                            ) : null}
                          </div>
                          {it.notes ? (
                            <p className="mt-2 text-sm text-[--color-ink-soft]">
                              {it.notes}
                            </p>
                          ) : null}
                        </div>
                        <div className="font-mono text-[11px] uppercase tracking-wider text-[--color-muted-2] pt-2">
                          ×{it.timesPerDay}/day
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            <div className="mt-12 flex items-end justify-between border-t border-[--color-rule] pt-6">
              <div className="eyebrow">Signature</div>
              <div className="text-right">
                <div className="font-display text-xl font-medium">{clinicName}</div>
                <div className="eyebrow mt-1">Attending physician</div>
              </div>
            </div>
          </article>

          <PhotoAttacher visitId={row.visit.id} initial={imageRows} />

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <Link href={`/patients/${row.patient.id}`} className="btn-ghost">
              Back to patient
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href={`/patients/${row.patient.id}/visits/${row.visit.id}/print?auto=1`}
                target="_blank"
                rel="noopener"
                className="btn-ghost"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                  <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Print
              </Link>
              <Link href={`/patients/${row.patient.id}/visits/new`} className="btn-primary">
                New prescription for next visit
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
