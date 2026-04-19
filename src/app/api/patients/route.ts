import { NextResponse } from "next/server";
import { and, desc, eq, ilike } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { patients } from "@/lib/db/schema";
import { patientCreateSchema } from "@/lib/validators/patient";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const where = q
    ? and(eq(patients.userId, session.user.id), ilike(patients.name, `%${q}%`))
    : eq(patients.userId, session.user.id);

  const rows = await db
    .select()
    .from(patients)
    .where(where)
    .orderBy(desc(patients.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = patientCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const values = parsed.data;
  const [inserted] = await db
    .insert(patients)
    .values({
      userId: session.user.id,
      name: values.name,
      age: values.age,
      dob: values.dob ?? null,
      firstVisitDate: values.firstVisitDate,
      conditions: JSON.stringify(values.conditions ?? []),
      notes: values.notes ?? "",
    })
    .returning();

  return NextResponse.json(inserted, { status: 201 });
}
