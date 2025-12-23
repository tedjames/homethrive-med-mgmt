/**
 * Zod validation schemas for the Schedule domain.
 */

import { z } from 'zod';

import { isValidIanaTimezone } from '../../shared/time-utils.js';

const timeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be HH:mm format');

const localDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD');

const dayOfWeekSchema = z.number().int().min(1).max(7);

const timezoneSchema = z
  .string()
  .max(64)
  .refine(isValidIanaTimezone, { message: 'Must be a valid IANA timezone' });

export const createScheduleInputSchema = z
  .object({
    medicationId: z.string().uuid(),
    recurrence: z.enum(['daily', 'weekly']),
    timeOfDay: timeOfDaySchema,
    timezone: timezoneSchema.nullable().optional(),
    daysOfWeek: z.array(dayOfWeekSchema).min(1).nullable().optional(),
    startDate: localDateSchema,
    endDate: localDateSchema.nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.recurrence === 'weekly') {
        return Array.isArray(data.daysOfWeek) && data.daysOfWeek.length > 0;
      }
      return true;
    },
    { message: 'Weekly schedules must specify at least one day of week' }
  )
  .refine(
    (data) => {
      if (data.recurrence === 'daily') {
        return data.daysOfWeek == null;
      }
      return true;
    },
    { message: 'Daily schedules must not specify days of week' }
  )
  .refine(
    (data) => {
      if (!data.endDate) return true;
      return data.endDate >= data.startDate;
    },
    { message: 'endDate must be on or after startDate' }
  );

export type CreateScheduleInputSchema = z.infer<typeof createScheduleInputSchema>;
