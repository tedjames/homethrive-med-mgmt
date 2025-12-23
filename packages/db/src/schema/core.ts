import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// --------------------
// Enums
// --------------------
export const recurrenceTypeEnum = pgEnum('recurrence_type_enum', ['daily', 'weekly']);
export type RecurrenceTypeEnum = (typeof recurrenceTypeEnum.enumValues)[number];

// --------------------
// Tables
// --------------------
export const users = pgTable('users', {
  /**
   * Clerk user id (e.g. "user_2bK...").
   *
   * We treat this as the canonical user identifier across the system for now,
   * since it is what we receive on each authenticated request.
   * 
   * Note: We could also rely on a different ID to decouple the user from the Clerk user ID which may be better...
   */
  clerkUserId: text('clerk_user_id').primaryKey(),
  email: text('email'),
  displayName: text('display_name'),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
});

export const careRecipients = pgTable(
  'care_recipients',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => users.clerkUserId, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(),
    timezone: text('timezone').notNull().default('America/New_York'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('care_recipients_created_by_user_id_idx').on(t.createdByUserId),
    // Unique constraint to support composite FK from medications
    uniqueIndex('care_recipients_id_created_by_user_id_unique').on(t.id, t.createdByUserId),
  ]
);

export const medications = pgTable(
  'medications',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => users.clerkUserId, { onDelete: 'cascade' }),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => careRecipients.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    instructions: text('instructions'),
    isActive: boolean('is_active').notNull().default(true),
    inactiveAt: timestamp('inactive_at', { withTimezone: true, mode: 'date' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('medications_created_by_user_id_idx').on(t.createdByUserId),
    index('medications_created_by_user_id_recipient_id_idx').on(t.createdByUserId, t.recipientId),
    index('medications_recipient_id_idx').on(t.recipientId),
    index('medications_recipient_active_idx').on(t.recipientId, t.isActive),
    // Unique constraint to support composite FK from schedules
    uniqueIndex('medications_id_created_by_user_id_unique').on(t.id, t.createdByUserId),
  ]
);

export const medicationSchedules = pgTable(
  'medication_schedules',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => users.clerkUserId, { onDelete: 'cascade' }),
    medicationId: uuid('medication_id')
      .notNull()
      .references(() => medications.id, { onDelete: 'cascade' }),
    recurrence: recurrenceTypeEnum('recurrence').notNull(),
    timeOfDay: text('time_of_day').notNull(),
    timezone: text('timezone'),
    daysOfWeek: smallint('days_of_week').array(),
    startDate: date('start_date', { mode: 'string' }).notNull(),
    endDate: date('end_date', { mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('medication_schedules_created_by_user_id_idx').on(t.createdByUserId),
    index('medication_schedules_created_by_user_id_medication_id_idx').on(
      t.createdByUserId,
      t.medicationId
    ),
    index('medication_schedules_medication_id_idx').on(t.medicationId),
    index('medication_schedules_medication_id_recurrence_idx').on(t.medicationId, t.recurrence),
    // Unique constraint to support composite FK from dose_taken (future)
    uniqueIndex('medication_schedules_id_created_by_user_id_unique').on(t.id, t.createdByUserId),
    check(
      'medication_schedules_weekly_requires_days',
      sql`
        (
          ${t.recurrence} = 'weekly'
          AND ${t.daysOfWeek} IS NOT NULL
          AND array_length(${t.daysOfWeek}, 1) >= 1
        )
        OR
        (
          ${t.recurrence} = 'daily'
          AND ${t.daysOfWeek} IS NULL
        )
      `
    ),
    check(
      'medication_schedules_days_of_week_bounds',
      sql`
        ${t.daysOfWeek} IS NULL
        OR ${t.daysOfWeek} <@ ARRAY[1,2,3,4,5,6,7]::smallint[]
      `
    ),
    // Validate time_of_day is HH:mm format (00:00 - 23:59)
    check(
      'medication_schedules_time_of_day_format',
      sql`${t.timeOfDay} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`
    ),
  ]
);

export const doseTaken = pgTable(
  'dose_taken',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => careRecipients.id, { onDelete: 'cascade' }),
    medicationId: uuid('medication_id')
      .notNull()
      .references(() => medications.id, { onDelete: 'cascade' }),
    scheduleId: uuid('schedule_id')
      .notNull()
      .references(() => medicationSchedules.id, { onDelete: 'cascade' }),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true, mode: 'date' }).notNull(),
    takenAt: timestamp('taken_at', { withTimezone: true, mode: 'date' }).notNull(),
    takenByUserId: text('taken_by_user_id')
      .notNull()
      .references(() => users.clerkUserId, { onDelete: 'cascade' }),
  },
  (t) => [
    index('dose_taken_recipient_scheduled_for_idx').on(t.recipientId, t.scheduledFor),
    index('dose_taken_medication_scheduled_for_idx').on(t.medicationId, t.scheduledFor),
    index('dose_taken_taken_by_user_id_idx').on(t.takenByUserId),
    uniqueIndex('dose_taken_schedule_scheduled_for_unique').on(t.scheduleId, t.scheduledFor),
  ]
);
