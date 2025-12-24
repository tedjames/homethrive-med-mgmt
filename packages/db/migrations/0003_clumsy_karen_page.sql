CREATE TYPE "public"."access_status_enum" AS ENUM('pending_request', 'pending_invite', 'approved', 'revoked');--> statement-breakpoint
CREATE TABLE "caregiver_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caregiver_user_id" text NOT NULL,
	"recipient_user_id" text NOT NULL,
	"status" "access_status_enum" NOT NULL,
	"requested_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "care_recipients" ALTER COLUMN "created_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "care_recipients" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "caregiver_access" ADD CONSTRAINT "caregiver_access_caregiver_user_id_users_clerk_user_id_fk" FOREIGN KEY ("caregiver_user_id") REFERENCES "public"."users"("clerk_user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caregiver_access" ADD CONSTRAINT "caregiver_access_recipient_user_id_users_clerk_user_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("clerk_user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "caregiver_access_caregiver_user_id_idx" ON "caregiver_access" USING btree ("caregiver_user_id");--> statement-breakpoint
CREATE INDEX "caregiver_access_recipient_user_id_idx" ON "caregiver_access" USING btree ("recipient_user_id");--> statement-breakpoint
CREATE INDEX "caregiver_access_status_idx" ON "caregiver_access" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "caregiver_access_active_unique" ON "caregiver_access" USING btree ("caregiver_user_id","recipient_user_id") WHERE "caregiver_access"."status" != 'revoked';--> statement-breakpoint
ALTER TABLE "care_recipients" ADD CONSTRAINT "care_recipients_user_id_users_clerk_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("clerk_user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "care_recipients_user_id_idx" ON "care_recipients" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "care_recipients_user_id_unique" ON "care_recipients" USING btree ("user_id");