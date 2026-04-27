import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { patients, visits } from "@/lib/db/schema";
import { prescriptionDocumentSchema } from "@/lib/validators/patient";
import { z } from "zod";

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

  const [row] = await db
    .select({
      visit: {
        id: visits.id,
        patientId: visits.patientId,
        visitDate: visits.visitDate,
        prescription: visits.prescription,
        status: visits.status,
        createdAt: visits.createdAt,
      },
      patient: {
        id: patients.id,
        name: patients.name,
        age: patients.age,
        dob: patients.dob,
        firstVisitDate: patients.firstVisitDate,
        conditions: patients.conditions,
        notes: patients.notes,
        createdAt: patients.createdAt,
      },
    })
    .from(visits)
    .innerJoin(patients, eq(visits.patientId, patients.id))
    .where(and(eq(visits.id, id), eq(patients.userId, session.user.id)))
    .limit(1);

  if (!row) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json(row, { headers: NO_STORE_HEADERS });
}

const patchSchema = z.object({
  visitDate: z.string().min(1).max(32).optional(),
  prescription: prescriptionDocumentSchema,
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const { id } = await params;

  // Ownership check via JOIN.
  const [owned] = await db
    .select({ id: visits.id })
    .from(visits)
    .innerJoin(patients, eq(visits.patientId, patients.id))
    .where(and(eq(visits.id, id), eq(patients.userId, session.user.id)))
    .limit(1);

  if (!owned) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", details: parsed.error.flatten() },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const updates: {
    prescription: string;
    status: "final";
    visitDate?: string;
  } = {
    prescription: JSON.stringify(parsed.data.prescription),
    status: "final",
  };
  if (parsed.data.visitDate) updates.visitDate = parsed.data.visitDate;

  const [updated] = await db
    .update(visits)
    .set(updates)
    .where(eq(visits.id, id))
    .returning({
      id: visits.id,
      patientId: visits.patientId,
      visitDate: visits.visitDate,
      prescription: visits.prescription,
      status: visits.status,
      createdAt: visits.createdAt,
    });

  return NextResponse.json(updated, { headers: NO_STORE_HEADERS });
}
