import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { patients } from "@/lib/db/schema";
import { parseConditions } from "@/lib/conditions";
import { ConditionChip } from "@/components/ConditionChip";
import { NewVisitEditor } from "./NewVisitEditor";

export default async function NewVisitPage({
  params,
}: {
  params: Promise<{ id: string }>;
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

  const conditions = parseConditions(patient.conditions);

  return (
    <div className="min-h-screen">
      <header className="container-shell flex items-center justify-between py-6">
        <Link href={`/patients/${patient.id}`} className="btn-link">
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to {patient.name.split(" ")[0]}
        </Link>
        <span className="eyebrow">New prescription</span>
      </header>

      <main className="container-shell pb-16">
        <div className="reveal mb-8">
          <div className="eyebrow">Writing for</div>
          <div className="mt-1.5 flex items-baseline gap-4">
            <h1 className="font-display text-[clamp(2rem,4vw,2.75rem)] font-medium leading-tight tracking-tight">
              {patient.name}
            </h1>
            <span className="font-mono text-sm text-[--color-muted]">
              {patient.age} yr
            </span>
          </div>
          {conditions.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {conditions.map((slug) => (
                <ConditionChip key={slug} slug={slug} size="sm" />
              ))}
            </div>
          ) : null}
          {patient.notes ? (
            <p className="mt-4 max-w-2xl border-l-2 border-[--color-ochre] pl-4 font-display text-[15px] italic text-[--color-ink-soft]">
              {patient.notes}
            </p>
          ) : null}
        </div>

        <NewVisitEditor patientId={patient.id} patientName={patient.name} />
      </main>
    </div>
  );
}
