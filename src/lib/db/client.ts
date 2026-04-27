import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const IS_BUILD = process.env.NEXT_PHASE === "phase-production-build";
const connectionString =
  process.env.DATABASE_URL ??
  (IS_BUILD ? "postgres://build-placeholder@localhost:5432/placeholder" : "");

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.",
  );
}

const ssl = connectionString.includes("sslmode=disable")
  ? false
  : ("require" as const);

export const sqlClient = postgres(connectionString, {
  ssl,
  max: process.env.NETLIFY ? 1 : 5,
  idle_timeout: process.env.NETLIFY ? 5 : 20,
  connect_timeout: 10,
  prepare: false,
});

export const db = drizzle(sqlClient, { schema });

export function ensureMedicinesFts() {}
