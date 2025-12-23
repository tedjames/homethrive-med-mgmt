CREATE TABLE "users" (
	"clerk_user_id" text PRIMARY KEY NOT NULL,
	"email" text,
	"display_name" text,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "users" ("clerk_user_id")
SELECT DISTINCT "created_by_user_id" FROM "care_recipients"
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "users" ("clerk_user_id")
SELECT DISTINCT "taken_by_user_id" FROM "dose_taken"
ON CONFLICT DO NOTHING;
--> statement-breakpoint
ALTER TABLE "medications" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
UPDATE "medications" m
SET "created_by_user_id" = cr."created_by_user_id"
FROM "care_recipients" cr
WHERE m."recipient_id" = cr."id";
--> statement-breakpoint
ALTER TABLE "medications" ALTER COLUMN "created_by_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "medication_schedules" ADD COLUMN "created_by_user_id" text;--> statement-breakpoint
UPDATE "medication_schedules" s
SET "created_by_user_id" = m."created_by_user_id"
FROM "medications" m
WHERE s."medication_id" = m."id";
--> statement-breakpoint
ALTER TABLE "medication_schedules" ALTER COLUMN "created_by_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "care_recipients" ADD CONSTRAINT "care_recipients_created_by_user_id_users_clerk_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("clerk_user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dose_taken" ADD CONSTRAINT "dose_taken_taken_by_user_id_users_clerk_user_id_fk" FOREIGN KEY ("taken_by_user_id") REFERENCES "public"."users"("clerk_user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_schedules" ADD CONSTRAINT "medication_schedules_created_by_user_id_users_clerk_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("clerk_user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_created_by_user_id_users_clerk_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("clerk_user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dose_taken_taken_by_user_id_idx" ON "dose_taken" USING btree ("taken_by_user_id");--> statement-breakpoint
CREATE INDEX "medication_schedules_created_by_user_id_idx" ON "medication_schedules" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "medication_schedules_created_by_user_id_medication_id_idx" ON "medication_schedules" USING btree ("created_by_user_id","medication_id");--> statement-breakpoint
CREATE INDEX "medications_created_by_user_id_idx" ON "medications" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "medications_created_by_user_id_recipient_id_idx" ON "medications" USING btree ("created_by_user_id","recipient_id");