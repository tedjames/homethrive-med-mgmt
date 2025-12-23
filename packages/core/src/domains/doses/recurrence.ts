/**
 * DST-safe recurrence generation.
 */

import { DateTime } from 'luxon';

import type { MedicationSchedule } from '../schedules/entity.js';
import { DEFAULT_TIMEZONE, parseTimeOfDay } from '../../shared/time-utils.js';
import { InvalidWindowError } from './errors.js';

function setTimeOfDayWithDST(
  date: DateTime,
  hour: number,
  minute: number,
  timezone: string
): DateTime {
  // Build by setting time on an existing local DateTime so that ambiguous times
  // (fall back) resolve to the earlier occurrence (matches spec policy).
  const scheduled = date.set({ hour, minute, second: 0, millisecond: 0 });
  if (scheduled.isValid) return scheduled;

  // Non-existent local time (spring forward): round up to the next valid minute.
  const midnight = date.set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).setZone(timezone);

  let cursor = midnight.plus({ hours: hour, minutes: minute });
  for (let i = 0; i < 180 && !cursor.isValid; i++) {
    cursor = cursor.plus({ minutes: 1 });
  }

  if (cursor.isValid) return cursor;

  // Should never happen for real IANA zones.
  return midnight;
}

/**
 * Generate dose occurrences for a schedule within a time window.
 * Returns array of UTC Date objects.
 *
 * Window semantics: Half-open interval [from, to)
 * - Doses at exactly `from` ARE included
 * - Doses at exactly `to` are NOT included
 *
 * This is intentional for pagination/windowing:
 * - To get all doses for Dec 1-7, use from=Dec1T00:00:00Z, to=Dec8T00:00:00Z
 * - Adjacent windows can use `to` of first = `from` of next without overlap
 *
 * @param schedule - The medication schedule with recurrence rules
 * @param from - Window start (inclusive)
 * @param to - Window end (exclusive)
 * @returns Array of UTC Date objects representing scheduled dose times
 * @throws InvalidWindowError if from > to
 */
export function generateOccurrences(schedule: MedicationSchedule, from: Date, to: Date): Date[] {
  if (from > to) {
    throw new InvalidWindowError();
  }

  // Use || instead of ?? to handle empty string timezone
  const timezone = schedule.timezone || DEFAULT_TIMEZONE;
  const { hour, minute } = parseTimeOfDay(schedule.timeOfDay);

  const occurrences: Date[] = [];

  const localFrom = DateTime.fromJSDate(from, { zone: timezone });
  const localTo = DateTime.fromJSDate(to, { zone: timezone });

  const windowStartLocalDay = localFrom.startOf('day');
  const windowEndLocalDay = localTo.startOf('day');

  let cursor = windowStartLocalDay;

  const daysOfWeek = schedule.daysOfWeek ?? [];

  while (cursor <= windowEndLocalDay) {
    const localDate = cursor.toISODate();
    if (!localDate) {
      cursor = cursor.plus({ days: 1 });
      continue;
    }

    if (localDate < schedule.startDate) {
      cursor = cursor.plus({ days: 1 });
      continue;
    }

    if (schedule.endDate && localDate > schedule.endDate) {
      break;
    }

    const shouldIncludeForRecurrence =
      schedule.recurrence === 'daily'
        ? true
        : schedule.recurrence === 'weekly'
          ? daysOfWeek.includes(cursor.weekday)
          : false;

    if (shouldIncludeForRecurrence) {
      const scheduledLocal = setTimeOfDayWithDST(cursor, hour, minute, timezone);
      const scheduledUTC = scheduledLocal.toUTC().toJSDate();

      if (scheduledUTC >= from && scheduledUTC < to) {
        occurrences.push(scheduledUTC);
      }
    }

    cursor = cursor.plus({ days: 1 });
  }

  return occurrences;
}
