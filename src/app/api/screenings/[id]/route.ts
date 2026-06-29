import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { patients, screenings } from "@/lib/db/schema";
import { oralQuestionnaireSchema } from "@/lib/validators/screening";
import { runOralTriage } from "@/lib/screening";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, private",
  Vary: "Cookie",
} as const;

// GET — full screening + its patient (for the doctor's case-detail screen).
export async function GET(
  _req: Request,
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
  const [row] = await db
    .select({
      screening: screenings,
      patient: {
        id: patients.id,
        name: patients.name,
        age: patients.age,
        gender: patients.gender,
        mobile: patients.mobile,
      },
    })
    .from(screenings)
    .innerJoin(patients, eq(screenings.patientId, patients.id))
    .where(and(eq(screenings.id, id), eq(screenings.userId, session.user.id)))
    .limit(1);

  if (!row) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(row, { headers: NO_STORE_HEADERS });
}

const finalizeSchema = z.object({
  screeningDate: z.string().min(1).max(32).optional(),
  questionnaire: oralQuestionnaireSchema,
});

// PATCH — submit the completed questionnaire: run the triage engine, persist
// the band/score/reasons, and flip the screening to final / pending review.
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

  // Ownership check + grab the patient age the engine needs.
  const [owned] = await db
    .select({ id: screenings.id, age: patients.age })
    .from(screenings)
    .innerJoin(patients, eq(screenings.patientId, patients.id))
    .where(and(eq(screenings.id, id), eq(screenings.userId, session.user.id)))
    .limit(1);

  if (!owned) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = finalizeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", details: parsed.error.flatten() },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const { questionnaire } = parsed.data;

  // Consent is a hard gate — never finalize a screening without it.
  if (!questionnaire.consent) {
    return NextResponse.json(
      { error: "consent_required" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const triage = runOralTriage(owned.age, questionnaire);

  const updates: Record<string, unknown> = {
    questionnaire: JSON.stringify(questionnaire),
    riskScore: triage.score,
    riskBand: triage.band,
    triageTier: triage.tier,
    firedReasons: JSON.stringify(triage.firedReasons),
    rulesetVersion: triage.rulesetVersion,
    reviewStatus: "pending",
    status: "final",
  };
  if (parsed.data.screeningDate) updates.screeningDate = parsed.data.screeningDate;

  const [updated] = await db
    .update(screenings)
    .set(updates)
    .where(eq(screenings.id, id))
    .returning();

  return NextResponse.json(updated, { headers: NO_STORE_HEADERS });
}
