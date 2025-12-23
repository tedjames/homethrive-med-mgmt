CREATE TYPE "public"."recurrence_type_enum" AS ENUM('daily', 'weekly');--> statement-breakpoint
CREATE TABLE "care_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dose_taken" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"medication_id" uuid NOT NULL,
	"schedule_id" uuid NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"taken_at" timestamp with time zone NOT NULL,
	"taken_by_user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medication_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medication_id" uuid NOT NULL,
	"recurrence" "recurrence_type_enum" NOT NULL,
	"time_of_day" text NOT NULL,
	"timezone" text,
	"days_of_week" smallint[],
	"start_date" date NOT NULL,
	"end_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "medication_schedules_weekly_requires_days" CHECK (
        (
          "medication_schedules"."recurrence" = 'weekly'
          AND "medication_schedules"."days_of_week" IS NOT NULL
          AND array_length("medication_schedules"."days_of_week", 1) >= 1
        )
        OR
        (
          "medication_schedules"."recurrence" = 'daily'
          AND "medication_schedules"."days_of_week" IS NULL
        )
      ),
	CONSTRAINT "medication_schedules_days_of_week_bounds" CHECK (
        "medication_schedules"."days_of_week" IS NULL
        OR "medication_schedules"."days_of_week" <@ ARRAY[1,2,3,4,5,6,7]::smallint[]
      )
);
--> statement-breakpoint
CREATE TABLE "medications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"name" text NOT NULL,
	"instructions" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"inactive_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dose_taken" ADD CONSTRAINT "dose_taken_recipient_id_care_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."care_recipients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dose_taken" ADD CONSTRAINT "dose_taken_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dose_taken" ADD CONSTRAINT "dose_taken_schedule_id_medication_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."medication_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_schedules" ADD CONSTRAINT "medication_schedules_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medications" ADD CONSTRAINT "medications_recipient_id_care_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."care_recipients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "care_recipients_created_by_user_id_idx" ON "care_recipients" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "dose_taken_recipient_scheduled_for_idx" ON "dose_taken" USING btree ("recipient_id","scheduled_for");--> statement-breakpoint
CREATE INDEX "dose_taken_medication_scheduled_for_idx" ON "dose_taken" USING btree ("medication_id","scheduled_for");--> statement-breakpoint
CREATE UNIQUE INDEX "dose_taken_schedule_scheduled_for_unique" ON "dose_taken" USING btree ("schedule_id","scheduled_for");--> statement-breakpoint
CREATE INDEX "medication_schedules_medication_id_idx" ON "medication_schedules" USING btree ("medication_id");--> statement-breakpoint
CREATE INDEX "medication_schedules_medication_id_recurrence_idx" ON "medication_schedules" USING btree ("medication_id","recurrence");--> statement-breakpoint
CREATE INDEX "medications_recipient_id_idx" ON "medications" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "medications_recipient_active_idx" ON "medications" USING btree ("recipient_id","is_active");