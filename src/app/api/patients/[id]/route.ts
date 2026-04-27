import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { patients, visits } from "@/lib/db/schema";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, private",
  Vary: "Cookie",
} as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const { id } = await params;

  const [patient] = await db
    .select({
      id: patients.id,
      name: patients.name,
      age: patients.age,
      dob: patients.dob,
      firstVisitDate: patients.firstVisitDate,
      conditions: patients.conditions,
      notes: patients.notes,
      createdAt: patients.createdAt,
    })
    .from(patients)
    .where(and(eq(patients.id, id), eq(patients.userId, session.user.id)))
    .limit(1);

  if (!patient) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }

  const patientVisits = await db
    .select({
      id: visits.id,
      patientId: visits.patientId,
      visitDate: visits.visitDate,
      prescription: visits.prescription,
      createdAt: visits.createdAt,
    })
    .from(visits)
    .where(eq(visits.patientId, patient.id))
    .orderBy(desc(visits.visitDate));

  return NextResponse.json(
    { patient, visits: patientVisits },
    { headers: NO_STORE_HEADERS }
  );
}
