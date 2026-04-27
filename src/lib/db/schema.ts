import { sql } from "drizzle-orm";
import {
  bigint,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
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

export const visits = pgTable(
  "visits",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    patientId: text("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    visitDate: text("visit_date").notNull(),
    // JSON-serialized PrescriptionDocument
    prescription: text("prescription").notNull(),
    // "draft" while Rx is being composed and photos can attach; "final" once
    // the doctor hits Save. Legacy rows default to "final" on migration.
    status: text("status").notNull().default("final"),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (t) => ({
    statusIdx: index("visits_status_idx").on(t.status),
  }),
);

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
    createdByUserId: text("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    // Drug class for duration defaults: antibiotic | nsaid | ppi |
    // antihypertensive | statin | oha | multivitamin | supplement | other.
    // Backfilled by heuristic match on brand/generic/composition.
    class: text("class"),
  },
  (t) => ({
    brandIdx: index("medicines_brand_idx").on(t.brand),
    formIdx: index("medicines_form_idx").on(t.form),
    systemIdx: index("medicines_system_idx").on(t.system),
    classIdx: index("medicines_class_idx").on(t.class),
    // Partial unique index backing the POST /api/medicines dedupe check.
    // Only user-created rows need this constraint (source='user'); the seeded
    // catalog has no created_by_user_id.
    userDedupeIdx: uniqueIndex("medicines_user_dedupe_idx")
      .on(
        t.createdByUserId,
        sql`LOWER(${t.brand})`,
        sql`COALESCE(${t.strength}, '')`,
        sql`COALESCE(${t.form}, '')`,
        sql`COALESCE(${t.system}, '')`,
      )
      .where(sql`${t.createdByUserId} IS NOT NULL`),
  }),
);

export const doctors = pgTable("doctors", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  clinicName: text("clinic_name"),
  clinicAddress: text("clinic_address"),
  clinicPhone: text("clinic_phone"),
  registrationNumber: text("registration_number"),
  // JSON-stringified string[]
  degrees: text("degrees"),
  specialty: text("specialty"),
  timings: text("timings"),
  // Optional base64 PNG/JPEG data URL, capped at 200KB by the validator.
  signatureDataUrl: text("signature_data_url"),
  updatedAt: bigint("updated_at", { mode: "number" })
    .notNull()
    .$defaultFn(() => Date.now()),
});

export const visitImages = pgTable(
  "visit_images",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    visitId: text("visit_id")
      .notNull()
      .references(() => visits.id, { onDelete: "cascade" }),
    // Denormalized so every image query can scope by doctor without JOINing.
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (t) => ({
    visitIdx: index("visit_images_visit_idx").on(t.visitId),
    userIdx: index("visit_images_user_idx").on(t.userId),
  }),
);

export type UserRow = typeof users.$inferSelect;
export type PatientRow = typeof patients.$inferSelect;
export type VisitRow = typeof visits.$inferSelect;
export type MedicineRow = typeof medicines.$inferSelect;
export type DoctorRow = typeof doctors.$inferSelect;
export type VisitImageRow = typeof visitImages.$inferSelect;

export { sql };
