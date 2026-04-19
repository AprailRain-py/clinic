import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { patients, visits } from "@/lib/db/schema";
import { ConditionChip } from "@/components/ConditionChip";
import { parseConditions } from "@/lib/conditions";

type Params = { id: string };

export default async function PatientPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;

  const [patient] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, id), eq(patients.userId, session.user.id)))
    .limit(1);

  if (!patient) notFound();

  const visitRows = await db
    .select()
    .from(visits)
    .where(eq(visits.patientId, patient.id))
    .orderBy(desc(visits.visitDate));

  const conditions = parseConditions(patient.conditions);
  const initials = (patient.name.split(" ").map((s) => s[0]).join("") || "?")
    .slice(0, 2)
    .toUpperCase();

  const visitsByMonth = new Map<string, typeof visitRows>();
  for (const v of visitRows) {
    const key = v.visitDate.slice(0, 7);
    const arr = visitsByMonth.get(key) ?? [];
    arr.push(v);
    visitsByMonth.set(key, arr);
  }

  return (
    <div className="min-h-screen">
      <header className="container-shell flex items-center justify-between py-6">
        <Link href="/" className="btn-link">
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Directory
        </Link>
        <span className="eyebrow font-mono">
          {patient.id.slice(0, 6)}
        </span>
      </header>

      <main className="container-shell pb-20">
        <section className="reveal grid gap-10 border-b border-[--color-rule] pb-12 md:grid-cols-[auto_1fr_auto]">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-[--color-rule] bg-[--color-card] font-display text-3xl font-medium text-[--color-pine]">
            {initials}
          </div>

          <div>
            <div className="eyebrow">Patient record</div>
            <h1 className="font-display mt-2 text-[clamp(2.25rem,4vw,3.25rem)] font-medium leading-[1.02] tracking-tight">
              {patient.name}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
              <Fact label="Age" value={`${patient.age} yr`} />
              {patient.dob ? <Fact label="DOB" value={patient.dob} /> : null}
              <Fact label="First visit" value={patient.firstVisitDate} />
              <Fact label="Total visits" value={`${visitRows.length}`} />
            </div>

            {conditions.length > 0 ? (
              <div className="mt-5">
                <div className="eyebrow mb-2">Category</div>
                <div className="flex flex-wrap gap-1.5">
                  {conditions.map((slug) => (
                    <ConditionChip key={slug} slug={slug} />
                  ))}
                </div>
              </div>
            ) : null}

            {patient.notes ? (
              <div className="mt-5 max-w-xl border-l-2 border-[--color-pine] pl-4">
                <div className="eyebrow mb-1">Chart note</div>
                <p className="font-display text-[15px] italic leading-relaxed text-[--color-ink-soft]">
                  {patient.notes}
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex items-start">
            <Link
              href={`/patients/${patient.id}/visits/new`}
              className="btn-primary"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              New visit
            </Link>
          </div>
        </section>

        <section className="reveal mt-12" style={{ animationDelay: "120ms" }}>
          <div className="mb-6 flex items-baseline justify-between">
            <div>
              <div className="eyebrow">Chronology</div>
              <h2 className="font-display mt-1 text-2xl font-medium">Visits</h2>
            </div>
            <span className="font-mono text-xs text-[--color-muted]">
              {visitRows.length} total
            </span>
          </div>

          {visitRows.length === 0 ? (
            <div className="card flex flex-col items-center justify-center gap-3 p-12 text-center">
              <div className="eyebrow">Empty ledger</div>
              <p className="font-display text-lg italic text-[--color-muted]">
                No visits logged yet.
              </p>
              <Link href={`/patients/${patient.id}/visits/new`} className="btn-primary mt-2">
                Write first prescription
              </Link>
            </div>
          ) : (
            <ol className="space-y-8">
              {Array.from(visitsByMonth.entries()).map(([month, list]) => {
                const d = new Date(month + "-01");
                const label = d.toLocaleDateString("en-GB", {
                  month: "long",
                  year: "numeric",
                });
                return (
                  <li key={month}>
                    <div className="mb-3 flex items-baseline gap-3">
                      <span className="font-display text-[13px] italic text-[--color-muted]">
                        {label}
                      </span>
                      <span className="h-px flex-1 bg-[--color-rule]" />
                    </div>
                    <ul className="space-y-2">
                      {list.map((v) => {
                        let itemCount = 0;
                        let snippet = "";
                        try {
                          const parsed = JSON.parse(v.prescription) as {
                            items?: { brand: string }[];
                            freeText?: string;
                          };
                          itemCount = parsed.items?.length ?? 0;
                          snippet = (parsed.freeText ?? "").slice(0, 80);
                        } catch {
                          /* ignore */
                        }
                        return (
                          <li key={v.id}>
                            <Link
                              href={`/patients/${patient.id}/visits/${v.id}`}
                              className="card-flat flex items-center justify-between gap-5 px-5 py-4 transition hover:border-[--color-muted-2]"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline gap-3">
                                  <span className="font-mono text-sm tabular-nums">
                                    {v.visitDate}
                                  </span>
                                  <span className="chip chip-pine">
                                    {itemCount} {itemCount === 1 ? "med" : "meds"}
                                  </span>
                                </div>
                                {snippet ? (
                                  <p className="mt-1.5 truncate font-display text-[14px] italic text-[--color-muted]">
                                    &ldquo;{snippet}
                                    {snippet.length >= 80 ? "..." : ""}&rdquo;
                                  </p>
                                ) : null}
                              </div>
                              <span className="btn-link text-xs">
                                Open
                                <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3">
                                  <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                                </svg>
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className="font-mono text-sm tabular-nums text-[--color-ink]">{value}</div>
    </div>
  );
}
