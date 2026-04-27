import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sqlClient } from "@/lib/db/client";

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

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const form = (searchParams.get("form") ?? "").trim();
  const system = (searchParams.get("system") ?? "").trim();

  // Build a parameterised WHERE clause. postgres-js uses tagged-template SQL,
  // so we assemble with its `unsafe` helper-free fragments via the `sql` helper.
  const sql = sqlClient;
  const like = `%${q}%`;
  const brandPrefix = `${q}%`; // prefix match gets scored higher

  let rows: MedicineRow[];

  if (q.length > 0) {
    rows = (await sql<MedicineRow[]>`
      SELECT id, brand, generic, composition, form, strength, manufacturer, system, class
      FROM medicines
      WHERE (brand ILIKE ${like} OR generic ILIKE ${like} OR composition ILIKE ${like})
        ${form ? sql`AND form = ${form}` : sql``}
        ${system ? sql`AND system = ${system}` : sql``}
      ORDER BY
        CASE WHEN brand ILIKE ${brandPrefix} THEN 0 ELSE 1 END,
        length(brand),
        brand
      LIMIT 20
    `);
  } else {
    rows = (await sql<MedicineRow[]>`
      SELECT id, brand, generic, composition, form, strength, manufacturer, system, class
      FROM medicines
      WHERE TRUE
        ${form ? sql`AND form = ${form}` : sql``}
        ${system ? sql`AND system = ${system}` : sql``}
      ORDER BY brand
      LIMIT 20
    `);
  }

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      brand: r.brand,
      generic: r.generic ?? undefined,
      composition: r.composition ?? undefined,
      form: r.form ?? undefined,
      strength: r.strength ?? undefined,
      manufacturer: r.manufacturer ?? undefined,
      system: r.system ?? undefined,
      class: r.class ?? undefined,
    })),
  );
}
