import Link from "next/link";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { signOut } from "@/auth";
import { requireDoctor } from "@/lib/auth/require-doctor";
import { db } from "@/lib/db/client";
import { patients, visits } from "@/lib/db/schema";
import { AppShell } from "@/components/AppShell";
import { PatientDirectory } from "./_components/PatientDirectory";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { session } = await requireDoctor();

  const rows = await db
    .select()
    .from(patients)
    .where(eq(patients.userId, session.user.id))
    .orderBy(desc(patients.createdAt))
    .limit(200);

  const patientIds = rows.map((r) => r.id);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  const patientVisits = patientIds.length
    ? await db
        .select({
          patientId: visits.patientId,
          visitDate: visits.visitDate,
        })
        .from(visits)
        .where(
          and(
            inArray(visits.patientId, patientIds),
            gte(visits.visitDate, thirtyDaysAgo),
          ),
        )
    : [];

  const visitsByPatient = new Map<string, number>();
  const lastVisitByPatient = new Map<string, string>();
  for (const v of patientVisits) {
    visitsByPatient.set(v.patientId, (visitsByPatient.get(v.patientId) ?? 0) + 1);
    const prev = lastVisitByPatient.get(v.patientId);
    if (!prev || v.visitDate > prev) lastVisitByPatient.set(v.patientId, v.visitDate);
  }

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  const enrichedRows = rows.map((p) => ({
    ...p,
    visitCount: visitsByPatient.get(p.id) ?? 0,
    lastVisit: lastVisitByPatient.get(p.id) ?? p.firstVisitDate,
  }));

  const visits30d = patientVisits.length;

  return (
    <AppShell
      user={session.user}
      actions={
        <form action={doSignOut}>
          <button type="submit" className="btn-ghost text-xs">
            Sign out
          </button>
        </form>
      }
    >
      <section className="reveal mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="eyebrow">Directory</div>
          <h1 className="font-display mt-1 text-2xl font-medium tracking-tight">
            Patients
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs text-[--color-muted]">
            {rows.length} {rows.length === 1 ? "patient" : "patients"}
            {visits30d > 0 ? ` · ${visits30d} visits in 30 days` : ""}
          </span>
          <Link href="/patients/new" className="btn-primary">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            New patient
          </Link>
        </div>
      </section>

      <PatientDirectory patients={enrichedRows} autoFocusSearch />
    </AppShell>
  );
}
