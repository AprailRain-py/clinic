import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { patients, visits } from "@/lib/db/schema";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, private",
  Vary: "Cookie",
} as const;

const EMPTY_PRESCRIPTION = JSON.stringify({ items: [], freeText: "" });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const json = (await req.json().catch(() => null)) as
    | { patientId?: unknown; visitDate?: unknown }
    | null;

  if (!json || typeof json.patientId !== "string" || !json.patientId) {
    return NextResponse.json(
      { error: "invalid" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const visitDate =
    typeof json.visitDate === "string" && json.visitDate.length > 0
      ? json.visitDate
      : today;

  // Verify the patient belongs to the caller.
  const [patient] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(
      and(eq(patients.id, json.patientId), eq(patients.userId, session.user.id)),
    )
    .limit(1);

  if (!patient) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  const [inserted] = await db
    .insert(visits)
    .values({
      patientId: patient.id,
      visitDate,
      prescription: EMPTY_PRESCRIPTION,
      status: "draft",
    })
    .returning({ id: visits.id });

  return NextResponse.json(
    { visitId: inserted.id },
    { status: 201, headers: NO_STORE_HEADERS },
  );
}
