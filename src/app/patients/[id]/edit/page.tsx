import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { patients } from "@/lib/db/schema";
import { parseConditions } from "@/lib/conditions";
import { PatientForm } from "@/components/PatientForm";

export const dynamic = "force-dynamic";

type Params = { id: string };

export default async function EditPatientPage({
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

  const initialGender: "male" | "female" | "other" | undefined =
    patient.gender === "male" ||
    patient.gender === "female" ||
    patient.gender === "other"
      ? patient.gender
      : undefined;

  const initial = {
    name: patient.name,
    age: patient.age,
    dob: patient.dob ?? undefined,
    gender: initialGender,
    mobile: patient.mobile ?? undefined,
    firstVisitDate: patient.firstVisitDate,
    notes: patient.notes ?? "",
    conditions: parseConditions(patient.conditions),
  };

  return (
    <div className="min-h-screen">
      <header className="container-shell flex items-center justify-between py-6">
        <Link href={`/patients/${patient.id}`} className="btn-link">
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <path
              d="m15 18-6-6 6-6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to {patient.name.split(" ")[0]}
        </Link>
        <span className="eyebrow font-mono">{patient.id.slice(0, 6)}</span>
      </header>

      <main className="container-shell pb-16">
        <div className="reveal mx-auto max-w-3xl">
          <div className="mb-8">
            <div className="eyebrow">Edit record</div>
            <h1 className="font-display mt-1 text-2xl font-medium tracking-tight">
              {patient.name}
            </h1>
            <p className="mt-2 max-w-lg text-sm text-[--color-muted]">
              Update identity, contact, and chart notes. Visits are unaffected.
            </p>
          </div>

          <PatientForm
            mode="edit"
            patientId={patient.id}
            initial={initial}
            cancelHref={`/patients/${patient.id}`}
          />
        </div>
      </main>
    </div>
  );
}
