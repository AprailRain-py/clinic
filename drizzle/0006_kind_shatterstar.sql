CREATE TABLE "screening_images" (
	"id" text PRIMARY KEY NOT NULL,
	"screening_id" text NOT NULL,
	"user_id" text NOT NULL,
	"view_type" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"quality_check" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screenings" (
	"id" text PRIMARY KEY NOT NULL,
	"patient_id" text NOT NULL,
	"user_id" text NOT NULL,
	"captured_by_user_id" text,
	"pathway" text DEFAULT 'oral' NOT NULL,
	"screening_date" text NOT NULL,
	"camp_id" text,
	"questionnaire" text NOT NULL,
	"risk_score" integer,
	"risk_band" text,
	"triage_tier" text,
	"fired_reasons" text,
	"ruleset_version" text,
	"review_status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" text,
	"doctor_notes" text,
	"referral" text,
	"outcome" text,
	"outcome_notes" text,
	"outcome_date" text,
	"ai_shadow" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" text DEFAULT 'doctor' NOT NULL;--> statement-breakpoint
ALTER TABLE "screening_images" ADD CONSTRAINT "screening_images_screening_id_screenings_id_fk" FOREIGN KEY ("screening_id") REFERENCES "public"."screenings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screening_images" ADD CONSTRAINT "screening_images_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screenings" ADD CONSTRAINT "screenings_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screenings" ADD CONSTRAINT "screenings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screenings" ADD CONSTRAINT "screenings_captured_by_user_id_user_id_fk" FOREIGN KEY ("captured_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screenings" ADD CONSTRAINT "screenings_reviewed_by_user_id_user_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "screening_images_screening_idx" ON "screening_images" USING btree ("screening_id");--> statement-breakpoint
CREATE INDEX "screening_images_user_idx" ON "screening_images" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "screenings_review_status_idx" ON "screenings" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "screenings_user_idx" ON "screenings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "screenings_patient_idx" ON "screenings" USING btree ("patient_id");