import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
  );
}

// Managed Postgres (DigitalOcean, Neon, Supabase, ...) require SSL.
// postgres-js: ssl: 'require' enables TLS and skips CA verification — fine
// for managed providers whose certs are not in Node's default trust store.
const isInternal = /\.(i)\.db\.ondigitalocean\.com/.test(connectionString);
const ssl = connectionString.includes("sslmode=disable")
  ? false
  : ("require" as const);

// Keep the connection pool small — Next.js API routes run in parallel
// and we want to avoid exhausting the DB's max_connections under light load.
// Serverless-friendly settings. In Lambda, each worker gets its own module
// state; we keep the pool tiny so we don't exhaust the managed DB's connection
// limit under bursty traffic.
export const sqlClient = postgres(connectionString, {
  ssl,
  max: process.env.NETLIFY ? 1 : 5,
  idle_timeout: process.env.NETLIFY ? 5 : 20,
  connect_timeout: 10,
  prepare: false, // compatible with pgbouncer / transaction-mode poolers
});

export const db = drizzle(sqlClient, { schema });

// Kept as a no-op for call sites that still reference it (was SQLite FTS5).
// Postgres uses an index + ILIKE for search; nothing to bootstrap.
export function ensureMedicinesFts() {
  void isInternal; // referenced so lint doesn't strip it
}
