import { NextResponse } from "next/server";
import { and, desc, eq, ilike, lt, or } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { patients } from "@/lib/db/schema";
import { patientCreateSchema } from "@/lib/validators/patient";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, private",
  Vary: "Cookie",
} as const;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const rawLimit = Number.parseInt(searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0
    ? Math.min(rawLimit, MAX_LIMIT)
    : DEFAULT_LIMIT;

  const cursor = searchParams.get("cursor")?.trim() || null;

  const ownerClause = eq(patients.userId, session.user.id);
  const searchClause = q ? ilike(patients.name, `%${q}%`) : undefined;

  let cursorClause = undefined;
  if (cursor) {
    const [cursorRow] = await db
      .select({
        id: patients.id,
        createdAt: patients.createdAt,
        userId: patients.userId,
      })
      .from(patients)
      .where(and(eq(patients.id, cursor), ownerClause))
      .limit(1);

    if (cursorRow) {
      // Keyset pagination: rows strictly after (createdAt desc, id desc).
      cursorClause = or(
        lt(patients.createdAt, cursorRow.createdAt),
        and(
          eq(patients.createdAt, cursorRow.createdAt),
          lt(patients.id, cursorRow.id)
        )
      );
    }
  }

  const where = and(
    ownerClause,
    ...(searchClause ? [searchClause] : []),
    ...(cursorClause ? [cursorClause] : [])
  );

  const rows = await db
    .select({
      id: patients.id,
      name: patients.name,
      age: patients.age,
      dob: patients.dob,
      firstVisitDate: patients.firstVisitDate,
      conditions: patients.conditions,
      notes: patients.notes,
      createdAt: patients.createdAt,
    })
    .from(patients)
    .where(where)
    .orderBy(desc(patients.createdAt), desc(patients.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return NextResponse.json(
    { patients: page, nextCursor },
    { headers: NO_STORE_HEADERS }
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = patientCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", details: parsed.error.flatten() },
      { status: 400, headers: NO_STORE_HEADERS }
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
    .returning({
      id: patients.id,
      name: patients.name,
      age: patients.age,
      dob: patients.dob,
      firstVisitDate: patients.firstVisitDate,
      conditions: patients.conditions,
      notes: patients.notes,
      createdAt: patients.createdAt,
    });

  return NextResponse.json(inserted, {
    status: 201,
    headers: NO_STORE_HEADERS,
  });
}
