/**
 * Backfill `medicines.class` for the full catalog using keyword heuristics.
 * Safe to re-run — only updates rows where class IS NULL.
 *
 *   node --env-file=.env.local node_modules/.pnpm/tsx@*\/node_modules/tsx/dist/cli.mjs scripts/classify-medicines.ts
 *
 * Or:  pnpm tsx --env-file=.env.local scripts/classify-medicines.ts
 */
import postgres from "postgres";
import { classifyMedicine } from "../src/lib/medicine-class";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is required");
}

const ssl = url.includes("sslmode=disable") ? false : ("require" as const);
const sql = postgres(url, { ssl, max: 4, prepare: false });

type Row = {
  id: string;
  brand: string;
  generic: string | null;
  composition: string | null;
};

const BATCH = 2000;

async function run() {
  const rescan = process.argv.includes("--rescan-other");
  const whereUnclassified = rescan
    ? sql`class IS NULL OR class = 'other'`
    : sql`class IS NULL`;

  const [{ total }] = (await sql<{ total: string }[]>`
    SELECT COUNT(*)::text AS total FROM medicines WHERE ${whereUnclassified}
  `) as { total: string }[];
  const totalN = Number(total);
  console.log(
    `[classify] ${totalN.toLocaleString()} rows to ${rescan ? "re" : ""}classify.`,
  );
  if (totalN === 0) {
    await sql.end();
    return;
  }

  let lastId = "";
  let processed = 0;
  const t0 = Date.now();

  while (true) {
    const rows = (await sql<Row[]>`
      SELECT id, brand, generic, composition
      FROM medicines
      WHERE ${whereUnclassified}
        ${lastId ? sql`AND id > ${lastId}` : sql``}
      ORDER BY id
      LIMIT ${BATCH}
    `) as Row[];
    if (rows.length === 0) break;

    // Build a VALUES-style bulk update via postgres-js's helper.
    const updates = rows.map((r) => ({
      id: r.id,
      class: classifyMedicine(r.brand, r.generic, r.composition),
    }));

    await sql`
      UPDATE medicines AS m SET class = u.class
      FROM (VALUES ${sql(updates.map((u) => [u.id, u.class] as const))}) AS u(id, class)
      WHERE m.id = u.id
    `;

    processed += rows.length;
    lastId = rows[rows.length - 1].id;
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const pct = ((processed / totalN) * 100).toFixed(0);
    console.log(
      `[classify] ${processed.toLocaleString()}/${totalN.toLocaleString()} (${pct}%, ${elapsed}s)`,
    );
  }

  console.log(
    `[classify] Done in ${((Date.now() - t0) / 1000).toFixed(1)}s.`,
  );
  await sql.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
