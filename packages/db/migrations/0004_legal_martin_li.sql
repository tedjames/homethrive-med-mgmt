ALTER TABLE "users" ADD COLUMN "timezone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_recipient" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_caregiver" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "has_completed_onboarding" boolean DEFAULT false NOT NULL;