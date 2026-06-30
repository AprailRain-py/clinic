// Applies migration 0006 (oral screening: users.role + screenings +
// screening_images) against whatever DATABASE_URL points to, using the app's
// own postgres client (which handles the DO managed-Postgres SSL — the reason
// we don't rely on `drizzle-kit migrate` on the droplet).
//
// Additive-only migration (no drops). Safe to re-run: statements that fail with
// "already exists" are skipped, so a partial apply can be finished by re-running.
//
// Usage on the droplet (with the production env loaded):
//   pnpm tsx scripts/apply-0006.ts
//
// ALWAYS run this against a DB you intend to change — it uses DATABASE_URL.

import { readFileSync } from "node:fs";
import { sqlClient } from "../src/lib/db/client";

const SQL = readFileSync(
  new URL("../drizzle/0006_kind_shatterstar.sql", import.meta.url),
  "utf8",
);

// Postgres "already exists" codes we treat as already-applied.
const EXISTS_CODES = new Set([
  "42P07", // duplicate_table / duplicate relation (table or index)
  "42701", // duplicate_column
  "42710", // duplicate_object (constraint)
]);

async function tablesPresent() {
  const rows = await sqlClient`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name IN ('screenings','screening_images')
    ORDER BY table_name
  `;
  const role = await sqlClient`
    SELECT 1 FROM information_schema.columns
    WHERE table_name='user' AND column_name='role'
  `;
  return {
    tables: rows.map((r) => r.table_name),
    userRole: role.length > 0,
  };
}

async function main() {
  const before = await tablesPresent();
  console.log("before: tables=", before.tables.join(",") || "(none)", "user.role=", before.userRole);

  const stmts = SQL.split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const s of stmts) {
    const preview = s.replace(/\s+/g, " ").slice(0, 90);
    try {
      await sqlClient.unsafe(s);
      console.log("ran    :", preview);
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code && EXISTS_CODES.has(code)) {
        console.log("skip   :", preview, `(already exists, ${code})`);
      } else {
        throw e;
      }
    }
  }

  const after = await tablesPresent();
  console.log("after : tables=", after.tables.join(","), "user.role=", after.userRole);
  await sqlClient.end({ timeout: 3 });
}

main().catch((e) => {
  console.error("ERR:", (e as { code?: string })?.code ?? "", (e as Error)?.message ?? e);
  process.exit(1);
});
