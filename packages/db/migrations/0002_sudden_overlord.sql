CREATE UNIQUE INDEX "care_recipients_id_created_by_user_id_unique" ON "care_recipients" USING btree ("id","created_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "medication_schedules_id_created_by_user_id_unique" ON "medication_schedules" USING btree ("id","created_by_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "medications_id_created_by_user_id_unique" ON "medications" USING btree ("id","created_by_user_id");--> statement-breakpoint
ALTER TABLE "medication_schedules" ADD CONSTRAINT "medication_schedules_time_of_day_format" CHECK ("medication_schedules"."time_of_day" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');--> statement-breakpoint
-- Composite FK: medications must belong to the same user as the care recipient
ALTER TABLE "medications" ADD CONSTRAINT "medications_recipient_user_fk"
  FOREIGN KEY ("recipient_id", "created_by_user_id")
  REFERENCES "care_recipients" ("id", "created_by_user_id")
  ON DELETE CASCADE;--> statement-breakpoint
-- Composite FK: schedules must belong to the same user as the medication
ALTER TABLE "medication_schedules" ADD CONSTRAINT "medication_schedules_medication_user_fk"
  FOREIGN KEY ("medication_id", "created_by_user_id")
  REFERENCES "medications" ("id", "created_by_user_id")
  ON DELETE CASCADE;