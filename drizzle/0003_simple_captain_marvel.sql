ALTER TABLE "medicines" ADD COLUMN "class" text;--> statement-breakpoint
CREATE INDEX "medicines_class_idx" ON "medicines" USING btree ("class");