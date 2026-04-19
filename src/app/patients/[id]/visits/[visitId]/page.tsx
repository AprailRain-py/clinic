import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { patients, visits } from "@/lib/db/schema";
import { FREQUENCY_LABELS, FREQUENCY_SHORT } from "@/components/prescription-editor/frequency";
import type { PrescriptionDocument } from "@/components/prescription-editor/types";
import { parseConditions } from "@/lib/conditions";
import { ConditionChip } from "@/components/ConditionChip";

type Params = { id: string; visitId: string };

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

function scheduleTag(frequency: string[], timesPerDay: number): string {
  if (timesPerDay === 1 && frequency.includes("before_sleep")) return "HS";
  if (timesPerDay === 4) return "QID";
  if (timesPerDay === 3 && frequency.every((f) => f.startsWith("before_"))) return "AC";
  if (timesPerDay === 3 && frequency.every((f) => f.startsWith("after_"))) return "PC";
  if (timesPerDay === 3) return "TID";
  if (timesPerDay === 2) return "BID";
  if (timesPerDay === 1) return "OD";
  return `${timesPerDay}/D`;
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

  return (
    <div className="min-h-screen">
      <header className="container-shell flex items-center justify-between py-6">
        <Link href={`/patients/${row.patient.id}`} className="btn-link">
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to {row.patient.name.split(" ")[0]}
        </Link>
        <span className="eyebrow font-mono">
          Rx {row.visit.id.slice(0, 6)}
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
                <div className="eyebrow">Prescription · Rx</div>
                <div className="mt-1 font-display text-[22px] italic">
                  Salve <span className="not-italic text-[--color-muted]">· clinic</span>
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
                <p className="font-display italic text-[--color-muted]">
                  No medicines prescribed.
                </p>
              ) : (
                <ol className="space-y-5">
                  {doc.items.map((it, idx) => (
                    <li key={idx} className="grid grid-cols-[auto_1fr_auto] gap-5">
                      <span className="font-mono text-xs text-[--color-muted-2] tabular-nums pt-1.5">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <div className="flex items-baseline gap-3">
                          <span className="font-display text-xl font-medium">
                            {it.brand}
                          </span>
                          {it.strength ? (
                            <span className="font-mono text-xs text-[--color-muted]">
                              {it.strength}
                            </span>
                          ) : null}
                          {it.form ? (
                            <span className="chip text-[10px]">
                              {it.form}
                            </span>
                          ) : null}
                        </div>
                        {it.generic || it.composition ? (
                          <div className="mt-0.5 font-display text-sm italic text-[--color-muted]">
                            {it.generic ?? it.composition}
                          </div>
                        ) : null}
                        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                          <span className="chip chip-pine">
                            {scheduleTag(it.frequency, it.timesPerDay)}
                          </span>
                          <span className="font-mono text-xs">
                            <span className="text-[--color-muted]">Duration · </span>
                            {it.durationDays}d
                          </span>
                          {it.frequency.length > 0 ? (
                            <span className="font-mono text-xs">
                              <span className="text-[--color-muted]">When · </span>
                              {it.frequency.map((f) => FREQUENCY_SHORT[f] ?? FREQUENCY_LABELS[f]).join(" + ")}
                            </span>
                          ) : null}
                        </div>
                        {it.notes ? (
                          <p className="mt-2 font-display text-sm italic text-[--color-ink-soft]">
                            &ldquo;{it.notes}&rdquo;
                          </p>
                        ) : null}
                      </div>
                      <div className="font-mono text-[11px] uppercase tracking-wider text-[--color-muted-2] pt-2">
                        ×{it.timesPerDay}/day
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <div className="mt-12 flex items-end justify-between border-t border-[--color-rule] pt-6">
              <div className="eyebrow">Signature</div>
              <div className="text-right">
                <div className="font-display text-xl italic">Dr. {row.patient.name.split(" ").slice(-1)[0] ? "" : ""}Salve</div>
                <div className="eyebrow mt-1">Attending physician</div>
              </div>
            </div>
          </article>

          <div className="mt-8 flex items-center justify-between">
            <Link href={`/patients/${row.patient.id}`} className="btn-ghost">
              Back to patient
            </Link>
            <Link href={`/patients/${row.patient.id}/visits/new`} className="btn-primary">
              Write another Rx
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
