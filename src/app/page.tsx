import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db/client";
import { patients, visits } from "@/lib/db/schema";
import { AppShell } from "@/components/AppShell";
import { parseConditions, conditionLabel } from "@/lib/conditions";
import { PatientDirectory } from "./_components/PatientDirectory";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const rows = await db
    .select()
    .from(patients)
    .where(eq(patients.userId, session.user.id))
    .orderBy(desc(patients.createdAt));

  const patientIds = rows.map((r) => r.id);
  const patientVisits = patientIds.length
    ? await db
        .select()
        .from(visits)
        .where(inArray(visits.patientId, patientIds))
    : [];

  const visitsByPatient = new Map<string, number>();
  const lastVisitByPatient = new Map<string, string>();
  for (const v of patientVisits) {
    visitsByPatient.set(v.patientId, (visitsByPatient.get(v.patientId) ?? 0) + 1);
    const prev = lastVisitByPatient.get(v.patientId);
    if (!prev || v.visitDate > prev) lastVisitByPatient.set(v.patientId, v.visitDate);
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const visitsThisWeek = patientVisits.filter((v) => new Date(v.visitDate) >= weekAgo).length;

  const conditionCounts = new Map<string, number>();
  for (const p of rows) {
    for (const c of parseConditions(p.conditions)) {
      conditionCounts.set(c, (conditionCounts.get(c) ?? 0) + 1);
    }
  }
  const topConditions = Array.from(conditionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (session.user.name ?? "Doctor").split(" ")[0];

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  const enrichedRows = rows.map((p) => ({
    ...p,
    visitCount: visitsByPatient.get(p.id) ?? 0,
    lastVisit: lastVisitByPatient.get(p.id) ?? p.firstVisitDate,
  }));

  return (
    <AppShell
      user={session.user}
      actions={
        <form action={doSignOut}>
          <button type="submit" className="btn-ghost">
            Sign out
          </button>
        </form>
      }
    >
      <section className="reveal mb-10 grid gap-8 md:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="eyebrow mb-3">Morning rounds</div>
          <h1 className="font-display text-[clamp(2.25rem,4.5vw,3.75rem)] font-medium leading-[1.02] tracking-tight">
            {greeting}, <span className="italic">{firstName}.</span>
          </h1>
          <p className="mt-4 max-w-lg font-display text-lg italic text-[--color-muted]">
            {rows.length === 0
              ? "A quiet ledger today. Add your first patient to begin the record."
              : `${rows.length} ${rows.length === 1 ? "patient" : "patients"} under your care. ${visitsThisWeek} ${visitsThisWeek === 1 ? "visit" : "visits"} logged this week.`}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/patients/new" className="btn-primary">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              New patient
            </Link>
            {rows.length > 0 ? (
              <Link href={`/patients/${rows[0].id}/visits/new`} className="btn-ghost">
                Write prescription for {rows[0].name.split(" ")[0]}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Patients" value={rows.length} hint="under care" accent="pine" />
          <StatCard label="Visits / wk" value={visitsThisWeek} hint="last 7 days" accent="ochre" />
          <StatCard label="Active cond." value={conditionCounts.size} hint="unique" accent="rust" />
        </div>
      </section>

      <div className="divider-thin mb-10" />

      <section className="grid gap-10 md:grid-cols-[2fr_1fr]">
        <div className="reveal" style={{ animationDelay: "80ms" }}>
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-medium">Directory</h2>
            <span className="eyebrow">{rows.length} total</span>
          </div>
          <PatientDirectory patients={enrichedRows} />
        </div>

        <aside className="reveal space-y-6" style={{ animationDelay: "160ms" }}>
          <div className="card p-5">
            <div className="eyebrow">Condition register</div>
            <h3 className="mt-1 font-display text-lg font-medium">Most seen this month</h3>
            {topConditions.length === 0 ? (
              <p className="mt-3 text-sm italic text-[--color-muted]">
                Nothing tracked yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-2.5">
                {topConditions.map(([slug, count]) => (
                  <li key={slug} className="flex items-baseline justify-between gap-4">
                    <span className="font-display text-[15px]">{conditionLabel(slug)}</span>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-[3px] rounded-full bg-[--color-pine]"
                        style={{
                          width: `${Math.max(12, (count / (topConditions[0][1] || 1)) * 72)}px`,
                        }}
                      />
                      <span className="font-mono text-xs tabular-nums text-[--color-muted]">
                        {count}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-5">
            <div className="eyebrow">Today&rsquo;s shortcut</div>
            <h3 className="mt-1 font-display text-lg font-medium">Recent visits</h3>
            {patientVisits.length === 0 ? (
              <p className="mt-3 text-sm italic text-[--color-muted]">
                No visits logged yet.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-[--color-rule]">
                {patientVisits
                  .slice()
                  .sort((a, b) => (a.visitDate < b.visitDate ? 1 : -1))
                  .slice(0, 4)
                  .map((v) => {
                    const p = rows.find((r) => r.id === v.patientId);
                    return (
                      <li key={v.id} className="py-2.5 first:pt-0">
                        <Link
                          href={`/patients/${v.patientId}/visits/${v.id}`}
                          className="flex items-baseline justify-between hover:text-[--color-pine]"
                        >
                          <span className="font-display text-[15px]">
                            {p?.name ?? "Unknown"}
                          </span>
                          <span className="font-mono text-xs text-[--color-muted]">
                            {v.visitDate}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        </aside>
      </section>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint: string;
  accent: "pine" | "ochre" | "rust";
}) {
  const accentClass =
    accent === "pine"
      ? "text-[--color-pine]"
      : accent === "ochre"
        ? "text-[--color-ochre]"
        : "text-[--color-rust]";
  return (
    <div className="card flex flex-col justify-between p-4">
      <div className={`eyebrow ${accentClass}`}>{label}</div>
      <div className="mt-2 font-display text-[42px] font-medium leading-none tracking-tight tabular-nums">
        {value}
      </div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[--color-muted]">
        {hint}
      </div>
    </div>
  );
}
