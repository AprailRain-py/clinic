import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { patients, visits } from "@/lib/db/schema";
import { visitCreateSchema } from "@/lib/validators/patient";

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
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, id), eq(patients.userId, session.user.id)))
    .limit(1);

  if (!patient) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }

  // Only surface final visits — drafts are an internal compose-state used
  // by the editor and the photo-attach flow. Drafts never appear in lists.
  const rows = await db
    .select({
      id: visits.id,
      patientId: visits.patientId,
      visitDate: visits.visitDate,
      prescription: visits.prescription,
      createdAt: visits.createdAt,
    })
    .from(visits)
    .where(and(eq(visits.patientId, patient.id), eq(visits.status, "final")))
    .orderBy(desc(visits.visitDate));

  return NextResponse.json({ visits: rows }, { headers: NO_STORE_HEADERS });
}

export async function POST(
  req: Request,
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
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, id), eq(patients.userId, session.user.id)))
    .limit(1);

  if (!patient) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = visitCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", details: parsed.error.flatten() },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const [inserted] = await db
    .insert(visits)
    .values({
      patientId: patient.id,
      visitDate: parsed.data.visitDate,
      prescription: JSON.stringify(parsed.data.prescription),
    })
    .returning({
      id: visits.id,
      patientId: visits.patientId,
      visitDate: visits.visitDate,
      prescription: visits.prescription,
      createdAt: visits.createdAt,
    });

  return NextResponse.json(inserted, {
    status: 201,
    headers: NO_STORE_HEADERS,
  });
}
