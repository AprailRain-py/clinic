import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

// Inlined from @auth/core/adapters to avoid a hard dep on a transitive type.
type AdapterAccountType = "oauth" | "oidc" | "email" | "webauthn";

// ----- NextAuth tables (Postgres schema per @auth/drizzle-adapter docs) -----
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compositePk: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compositePk: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

// ----- Clinic application tables -----
export const patients = pgTable("patients", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  dob: text("dob"),
  firstVisitDate: text("first_visit_date").notNull(),
  // JSON-stringified string[] of condition slugs
  conditions: text("conditions"),
  notes: text("notes"),
  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const visits = pgTable("visits", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  patientId: text("patient_id")
    .notNull()
    .references(() => patients.id, { onDelete: "cascade" }),
  visitDate: text("visit_date").notNull(),
  // JSON-serialized PrescriptionDocument
  prescription: text("prescription").notNull(),
  createdAt: bigint("created_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const medicines = pgTable(
  "medicines",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    brand: text("brand").notNull(),
    generic: text("generic"),
    composition: text("composition"),
    form: text("form"),
    strength: text("strength"),
    manufacturer: text("manufacturer"),
    system: text("system"),
    source: text("source"),
  },
  (t) => ({
    brandIdx: index("medicines_brand_idx").on(t.brand),
    formIdx: index("medicines_form_idx").on(t.form),
    systemIdx: index("medicines_system_idx").on(t.system),
  }),
);

export type UserRow = typeof users.$inferSelect;
export type PatientRow = typeof patients.$inferSelect;
export type VisitRow = typeof visits.$inferSelect;
export type MedicineRow = typeof medicines.$inferSelect;

export { sql };
