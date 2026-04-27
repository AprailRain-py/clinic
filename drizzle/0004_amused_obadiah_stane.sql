ALTER TABLE "visits" ADD COLUMN "status" text DEFAULT 'final' NOT NULL;--> statement-breakpoint
CREATE INDEX "visits_status_idx" ON "visits" USING btree ("status");