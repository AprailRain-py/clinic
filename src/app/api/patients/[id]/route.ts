import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { patients, visits } from "@/lib/db/schema";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [patient] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, id), eq(patients.userId, session.user.id)))
    .limit(1);

  if (!patient) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const patientVisits = await db
    .select()
    .from(visits)
    .where(eq(visits.patientId, patient.id))
    .orderBy(desc(visits.visitDate));

  return NextResponse.json({ patient, visits: patientVisits });
}
