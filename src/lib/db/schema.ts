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
  // Clinic account role: "doctor" (owner/reviewer) | "assistant" (MA who captures).
  role: text("role").notNull().default("doctor"),
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
  gender: text("gender"),
  mobile: text("mobile"),
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

export const screenings = pgTable(
  "screenings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    patientId: text("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    // Denormalized owning clinic account so the review queue can scope without
    // JOINing (mirrors how visit_images denormalizes userId).
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // The MA/assistant who captured this screening; null if they later leave.
    capturedByUserId: text("captured_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    // "oral" | "skin" (skin pathway added later).
    pathway: text("pathway").notNull().default("oral"),
    screeningDate: text("screening_date").notNull(),
    campId: text("camp_id"),
    // JSON-serialized answers: intake extras + risk factors + symptoms +
    // exam lesions + consent.
    questionnaire: text("questionnaire").notNull(),
    riskScore: integer("risk_score"),
    // "low" | "moderate" | "high"
    riskBand: text("risk_band"),
    // "RED" | "AMBER" | "YELLOW" | "GREEN"
    triageTier: text("triage_tier"),
    // JSON array of {id,tier,reason}
    firedReasons: text("fired_reasons"),
    rulesetVersion: text("ruleset_version"),
    // "pending" | "reviewed" | "referred" | "cleared"
    reviewStatus: text("review_status").notNull().default("pending"),
    reviewedByUserId: text("reviewed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    doctorNotes: text("doctor_notes"),
    // JSON
    referral: text("referral"),
    outcome: text("outcome"),
    outcomeNotes: text("outcome_notes"),
    outcomeDate: text("outcome_date"),
    // JSON, reserved for future shadow-mode AI. NOT shown clinically.
    aiShadow: text("ai_shadow"),
    // "draft" | "final" (mirrors visits' draft/final lifecycle).
    status: text("status").notNull().default("draft"),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (t) => ({
    reviewStatusIdx: index("screenings_review_status_idx").on(t.reviewStatus),
    userIdx: index("screenings_user_idx").on(t.userId),
    patientIdx: index("screenings_patient_idx").on(t.patientId),
  }),
);

export const screeningImages = pgTable(
  "screening_images",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    screeningId: text("screening_id")
      .notNull()
      .references(() => screenings.id, { onDelete: "cascade" }),
    // Denormalized so every image query can scope by doctor without JOINing.
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // e.g. "anterior_open", "buccal_right", "buccal_left", "tongue_dorsum",
    // "tongue_lateral", "ventral_floor", "palate", "lesion_closeup",
    // "quid_site_closeup".
    viewType: text("view_type").notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    // JSON {pass, blur, brightness, glare}
    qualityCheck: text("quality_check"),
    position: integer("position").notNull().default(0),
    createdAt: bigint("created_at", { mode: "number" })
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (t) => ({
    screeningIdx: index("screening_images_screening_idx").on(t.screeningId),
    userIdx: index("screening_images_user_idx").on(t.userId),
  }),
);

export type UserRow = typeof users.$inferSelect;
export type PatientRow = typeof patients.$inferSelect;
export type VisitRow = typeof visits.$inferSelect;
export type MedicineRow = typeof medicines.$inferSelect;
export type DoctorRow = typeof doctors.$inferSelect;
export type VisitImageRow = typeof visitImages.$inferSelect;
export type ScreeningRow = typeof screenings.$inferSelect;
export type ScreeningImageRow = typeof screeningImages.$inferSelect;

export { sql };
