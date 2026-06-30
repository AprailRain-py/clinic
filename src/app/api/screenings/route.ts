import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { patients, screenings } from "@/lib/db/schema";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, private",
  Vary: "Cookie",
} as const;

const REVIEW_STATUSES = ["pending", "reviewed", "referred", "cleared"] as const;
type ReviewStatus = (typeof REVIEW_STATUSES)[number];

// Doctor review queue. Only finalized screenings; sorted High → Moderate → Low
// then newest first, so the most urgent cases sit at the top.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  // Default to the pending queue; pass ?status=all to see everything.
  const reviewStatus =
    statusParam && REVIEW_STATUSES.includes(statusParam as ReviewStatus)
      ? (statusParam as ReviewStatus)
      : statusParam === "all"
        ? null
        : "pending";

  const where = and(
    eq(screenings.userId, session.user.id),
    eq(screenings.status, "final"),
    ...(reviewStatus ? [eq(screenings.reviewStatus, reviewStatus)] : []),
  );

  const bandOrder = sql`CASE ${screenings.riskBand} WHEN 'high' THEN 0 WHEN 'moderate' THEN 1 ELSE 2 END`;

  const rows = await db
    .select({
      id: screenings.id,
      patientId: screenings.patientId,
      patientName: patients.name,
      patientAge: patients.age,
      patientGender: patients.gender,
      pathway: screenings.pathway,
      screeningDate: screenings.screeningDate,
      riskScore: screenings.riskScore,
      riskBand: screenings.riskBand,
      triageTier: screenings.triageTier,
      firedReasons: screenings.firedReasons,
      reviewStatus: screenings.reviewStatus,
      outcome: screenings.outcome,
      createdAt: screenings.createdAt,
    })
    .from(screenings)
    .innerJoin(patients, eq(screenings.patientId, patients.id))
    .where(where)
    .orderBy(bandOrder, desc(screenings.createdAt));

  // Band counts for the queue header chips.
  const counts = { high: 0, moderate: 0, low: 0 };
  for (const r of rows) {
    if (r.riskBand === "high") counts.high++;
    else if (r.riskBand === "moderate") counts.moderate++;
    else if (r.riskBand === "low") counts.low++;
  }

  return NextResponse.json(
    { screenings: rows, counts },
    { headers: NO_STORE_HEADERS },
  );
}
