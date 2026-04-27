import type { Config } from "drizzle-kit";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is required for drizzle-kit (set it in .env.local or export it in your shell).",
  );
}

// DO managed Postgres requires SSL; local dev typically runs sslmode=disable.
// drizzle-kit uses node-postgres, which defaults SSL off and would otherwise
// hang on the SSL handshake against DO.
const ssl = url.includes("sslmode=disable")
  ? false
  : { rejectUnauthorized: false };

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url, ssl },
} satisfies Config;
