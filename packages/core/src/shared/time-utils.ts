/**
 * Time and date helpers.
 */

import { DateTime } from 'luxon';

export const DEFAULT_TIMEZONE = 'America/New_York';

const timeOfDayRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const localDateRegex = /^\d{4}-\d{2}-\d{2}$/;

export function isValidTimeOfDayString(value: string): boolean {
  return timeOfDayRegex.test(value);
}

export function parseTimeOfDay(value: string): { hour: number; minute: number } {
  const match = timeOfDayRegex.exec(value);
  if (!match) {
    throw new Error(`Invalid timeOfDay: ${value}`);
  }

  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export function isValidLocalDateString(value: string): boolean {
  return localDateRegex.test(value);
}

export function isValidIanaTimezone(timezone: string): boolean {
  // Luxon validates IANA zones via the Intl API.
  return DateTime.now().setZone(timezone).isValid;
}
