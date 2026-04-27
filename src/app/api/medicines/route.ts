import { NextResponse } from "next/server";
import { createId } from "@paralleldrive/cuid2";
import { auth } from "@/auth";
import { sqlClient } from "@/lib/db/client";
import { medicineCreateSchema } from "@/lib/validators/medicine";
import { classifyMedicine } from "@/lib/medicine-class";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, private",
  Vary: "Cookie",
} as const;

type MedicineRow = {
  id: string;
  brand: string;
  generic: string | null;
  composition: string | null;
  form: string | null;
  strength: string | null;
  manufacturer: string | null;
  system: string | null;
  class: string | null;
};

function serialize(r: MedicineRow) {
  return {
    id: r.id,
    brand: r.brand,
    generic: r.generic ?? undefined,
    composition: r.composition ?? undefined,
    form: r.form ?? undefined,
    strength: r.strength ?? undefined,
    manufacturer: r.manufacturer ?? undefined,
    system: r.system ?? undefined,
    class: r.class ?? undefined,
  };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: NO_STORE_HEADERS },
    );
  }
  const userId = session.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const parsed = medicineCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }
  const input = parsed.data;

  const sql = sqlClient;

  // Dedupe by (created_by_user_id, brand, strength, form, system) — case-insensitive
  // on brand. If a match exists for this user, return 409 with the existing row so
  // the client can hint and insert it into the editor instead of re-adding.
  const existing = (await sql<MedicineRow[]>`
    SELECT id, brand, generic, composition, form, strength, manufacturer, system, class
    FROM medicines
    WHERE created_by_user_id = ${userId}
      AND LOWER(brand) = LOWER(${input.brand})
      AND COALESCE(strength, '') = COALESCE(${input.strength ?? null}, '')
      AND COALESCE(form, '') = COALESCE(${input.form ?? null}, '')
      AND COALESCE(system, '') = COALESCE(${input.system ?? null}, '')
    LIMIT 1
  `);

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "duplicate", medicine: serialize(existing[0]) },
      { status: 409, headers: NO_STORE_HEADERS },
    );
  }

  const medicineClass = classifyMedicine(
    input.brand,
    input.generic ?? null,
    input.composition ?? null,
  );

  // Drizzle's $defaultFn(() => createId()) only fires via the ORM, not raw
  // tagged-template SQL. Generate the id explicitly.
  const newId = createId();

  const inserted = (await sql<MedicineRow[]>`
    INSERT INTO medicines (id, brand, generic, composition, form, strength, manufacturer, system, source, created_by_user_id, class)
    VALUES (
      ${newId},
      ${input.brand},
      ${input.generic ?? null},
      ${input.composition ?? null},
      ${input.form ?? null},
      ${input.strength ?? null},
      ${input.manufacturer ?? null},
      ${input.system ?? null},
      ${"user"},
      ${userId},
      ${medicineClass}
    )
    RETURNING id, brand, generic, composition, form, strength, manufacturer, system, class
  `);

  if (inserted.length === 0) {
    return NextResponse.json(
      { error: "insert_failed" },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  return NextResponse.json(serialize(inserted[0]), {
    status: 201,
    headers: NO_STORE_HEADERS,
  });
}
