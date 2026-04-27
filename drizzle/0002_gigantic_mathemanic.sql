CREATE TABLE "visit_images" (
	"id" text PRIMARY KEY NOT NULL,
	"visit_id" text NOT NULL,
	"user_id" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "visit_images" ADD CONSTRAINT "visit_images_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_images" ADD CONSTRAINT "visit_images_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "visit_images_visit_idx" ON "visit_images" USING btree ("visit_id");--> statement-breakpoint
CREATE INDEX "visit_images_user_idx" ON "visit_images" USING btree ("user_id");