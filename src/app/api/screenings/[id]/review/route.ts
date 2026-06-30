import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { screenings } from "@/lib/db/schema";
import { screeningReviewSchema } from "@/lib/validators/screening";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, private",
  Vary: "Cookie",
} as const;

// Doctor decision on a screening: reviewed / referred / cleared, with optional
// clinical note + referral (review interval, generated note text).
export async function POST(
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

  const [owned] = await db
    .select({ id: screenings.id })
    .from(screenings)
    .where(and(eq(screenings.id, id), eq(screenings.userId, session.user.id)))
    .limit(1);

  if (!owned) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = screeningReviewSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", details: parsed.error.flatten() },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const { reviewStatus, doctorNotes, reviewIntervalDays, referralNote } =
    parsed.data;

  const referral =
    reviewIntervalDays != null || referralNote
      ? JSON.stringify({ reviewIntervalDays, referralNote })
      : null;

  const [updated] = await db
    .update(screenings)
    .set({
      reviewStatus,
      doctorNotes: doctorNotes ?? null,
      reviewedByUserId: session.user.id,
      referral,
    })
    .where(eq(screenings.id, id))
    .returning();

  return NextResponse.json(updated, { headers: NO_STORE_HEADERS });
}
