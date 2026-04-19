import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { patients, visits } from "@/lib/db/schema";
import { visitCreateSchema } from "@/lib/validators/patient";

export async function POST(
  req: Request,
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

  const json = await req.json().catch(() => null);
  const parsed = visitCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [inserted] = await db
    .insert(visits)
    .values({
      patientId: patient.id,
      visitDate: parsed.data.visitDate,
      prescription: JSON.stringify(parsed.data.prescription),
    })
    .returning();

  return NextResponse.json(inserted, { status: 201 });
}
