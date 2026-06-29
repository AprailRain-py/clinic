import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { patients, screenings } from "@/lib/db/schema";
import { emptyOralQuestionnaire, pathwayEnum } from "@/lib/validators/screening";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, private",
  Vary: "Cookie",
} as const;

// Creates a draft screening so the MA can attach guided photos before the
// questionnaire is submitted. Mirrors POST /api/visits/draft.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const json = (await req.json().catch(() => null)) as {
    patientId?: unknown;
    pathway?: unknown;
    screeningDate?: unknown;
  } | null;

  if (!json || typeof json.patientId !== "string" || !json.patientId) {
    return NextResponse.json(
      { error: "invalid" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const pathway = pathwayEnum.catch("oral").parse(json.pathway);
  const today = new Date().toISOString().slice(0, 10);
  const screeningDate =
    typeof json.screeningDate === "string" && json.screeningDate.length > 0
      ? json.screeningDate
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
    .insert(screenings)
    .values({
      patientId: patient.id,
      userId: session.user.id,
      capturedByUserId: session.user.id,
      pathway,
      screeningDate,
      questionnaire: JSON.stringify(emptyOralQuestionnaire()),
      status: "draft",
    })
    .returning({ id: screenings.id });

  return NextResponse.json(
    { screeningId: inserted.id },
    { status: 201, headers: NO_STORE_HEADERS },
  );
}
