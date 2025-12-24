/**
 * Recurrence generation tests.
 */

import { DateTime } from 'luxon';
import { describe, expect, it } from 'vitest';

import { generateOccurrences } from '../recurrence.js';
import { InvalidWindowError } from '../errors.js';

describe('generateOccurrences - daily', () => {
  it('generates daily occurrences at specified time', () => {
    const schedule = {
      id: 'sched-1',
      medicationId: 'med-1',
      recurrence: 'daily' as const,
      timeOfDay: '09:00',
      timezone: 'America/New_York',
      daysOfWeek: null,
      startDate: '2024-12-01',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const from = new Date('2024-12-01T00:00:00Z');
    const to = new Date('2024-12-04T00:00:00Z');

    const occurrences = generateOccurrences(schedule, from, to);
    expect(occurrences).toHaveLength(3);
  });

  it('handles DST spring forward (non-existent time) by rounding up', () => {
    // America/New_York: DST starts 2024-03-10 (02:00 jumps to 03:00)
    const schedule = {
      id: 'sched-1',
      medicationId: 'med-1',
      recurrence: 'daily' as const,
      timeOfDay: '02:30',
      timezone: 'America/New_York',
      daysOfWeek: null,
      startDate: '2024-03-09',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const from = new Date('2024-03-09T00:00:00Z');
    const to = new Date('2024-03-11T00:00:00Z');

    const occurrences = generateOccurrences(schedule, from, to);

    const march10 = occurrences.find((d) => {
      const dt = DateTime.fromJSDate(d, { zone: 'America/New_York' });
      return dt.toISODate() === '2024-03-10';
    });

    expect(march10).toBeDefined();

    const dt = DateTime.fromJSDate(march10!, { zone: 'America/New_York' });
    expect(dt.hour).toBe(3);
    expect(dt.minute).toBe(30);
  });

  it('handles DST fall back (ambiguous time) by using the earlier occurrence', () => {
    // America/New_York: DST ends 2024-11-03 (01:00 repeats)
    const schedule = {
      id: 'sched-1',
      medicationId: 'med-1',
      recurrence: 'daily' as const,
      timeOfDay: '01:30',
      timezone: 'America/New_York',
      daysOfWeek: null,
      startDate: '2024-11-02',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const from = new Date('2024-11-02T00:00:00Z');
    const to = new Date('2024-11-04T00:00:00Z');

    const occurrences = generateOccurrences(schedule, from, to);

    const nov3 = occurrences.find((d) => {
      const dt = DateTime.fromJSDate(d, { zone: 'America/New_York' });
      return dt.toISODate() === '2024-11-03';
    });

    expect(nov3).toBeDefined();

    const dt = DateTime.fromJSDate(nov3!, { zone: 'America/New_York' });
    expect(dt.offset).toBe(-240);
  });
});

describe('generateOccurrences - weekly', () => {
  it('generates weekly occurrences on specified days', () => {
    const schedule = {
      id: 'sched-1',
      medicationId: 'med-1',
      recurrence: 'weekly' as const,
      timeOfDay: '09:00',
      timezone: 'America/New_York',
      daysOfWeek: [1, 3, 5],
      startDate: '2024-12-01',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const from = new Date('2024-12-01T00:00:00Z');
    const to = new Date('2024-12-08T00:00:00Z');

    const occurrences = generateOccurrences(schedule, from, to);
    expect(occurrences).toHaveLength(3);
  });

  it('generates occurrences only on specified non-contiguous days', () => {
    // Mon=1, Thu=4, Sun=7
    const schedule = {
      id: 'sched-1',
      medicationId: 'med-1',
      recurrence: 'weekly' as const,
      timeOfDay: '10:00',
      timezone: 'UTC',
      daysOfWeek: [1, 4, 7],
      startDate: '2024-12-01',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Dec 1, 2024 is Sunday (7), Dec 2 is Monday (1), Dec 5 is Thursday (4), Dec 8 is Sunday (7)
    const from = new Date('2024-12-01T00:00:00Z');
    const to = new Date('2024-12-09T00:00:00Z');

    const occurrences = generateOccurrences(schedule, from, to);
    // Should get: Dec 1 (Sun), Dec 2 (Mon), Dec 5 (Thu), Dec 8 (Sun) = 4 occurrences
    expect(occurrences).toHaveLength(4);

    const days = occurrences.map((d) => DateTime.fromJSDate(d, { zone: 'UTC' }).weekday);
    expect(days).toEqual([7, 1, 4, 7]); // Sun, Mon, Thu, Sun
  });
});

describe('generateOccurrences - window validation', () => {
  it('throws InvalidWindowError when from > to', () => {
    const schedule = {
      id: 'sched-1',
      medicationId: 'med-1',
      recurrence: 'daily' as const,
      timeOfDay: '09:00',
      timezone: 'America/New_York',
      daysOfWeek: null,
      startDate: '2024-12-01',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const from = new Date('2024-12-10T00:00:00Z');
    const to = new Date('2024-12-01T00:00:00Z');

    expect(() => generateOccurrences(schedule, from, to)).toThrow(InvalidWindowError);
  });

  it('returns empty array when from === to (zero-width window)', () => {
    const schedule = {
      id: 'sched-1',
      medicationId: 'med-1',
      recurrence: 'daily' as const,
      timeOfDay: '09:00',
      timezone: 'America/New_York',
      daysOfWeek: null,
      startDate: '2024-12-01',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const from = new Date('2024-12-05T12:00:00Z');
    const to = new Date('2024-12-05T12:00:00Z');

    const occurrences = generateOccurrences(schedule, from, to);
    expect(occurrences).toHaveLength(0);
  });

  it('uses half-open interval [from, to) - includes from, excludes to', () => {
    const schedule = {
      id: 'sched-1',
      medicationId: 'med-1',
      recurrence: 'daily' as const,
      timeOfDay: '00:00', // Midnight UTC
      timezone: 'UTC',
      daysOfWeek: null,
      startDate: '2024-12-01',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Test: dose at exactly `from` IS included
    const from1 = new Date('2024-12-01T00:00:00Z');
    const to1 = new Date('2024-12-02T00:00:00Z');
    const occurrences1 = generateOccurrences(schedule, from1, to1);
    expect(occurrences1).toHaveLength(1);
    expect(occurrences1[0]!.toISOString()).toBe('2024-12-01T00:00:00.000Z');

    // Test: dose at exactly `to` is NOT included
    const from2 = new Date('2024-11-30T00:00:01Z');
    const to2 = new Date('2024-12-01T00:00:00Z'); // Exactly midnight Dec 1
    const occurrences2 = generateOccurrences(schedule, from2, to2);
    expect(occurrences2).toHaveLength(0);
  });
});

describe('generateOccurrences - timezone edge cases', () => {
  it('uses default timezone when schedule.timezone is empty string', () => {
    const schedule = {
      id: 'sched-1',
      medicationId: 'med-1',
      recurrence: 'daily' as const,
      timeOfDay: '09:00',
      timezone: '', // Empty string should fall back to default (America/New_York)
      daysOfWeek: null,
      startDate: '2024-12-01',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const from = new Date('2024-12-01T00:00:00Z');
    const to = new Date('2024-12-02T00:00:00Z');

    // Should not throw and should use America/New_York (EST = UTC-5)
    const occurrences = generateOccurrences(schedule, from, to);
    expect(occurrences).toHaveLength(1);

    // 09:00 EST = 14:00 UTC
    const dt = DateTime.fromJSDate(occurrences[0]!, { zone: 'UTC' });
    expect(dt.hour).toBe(14);
  });

  it('generates correct occurrences for UTC timezone (no DST)', () => {
    const schedule = {
      id: 'sched-1',
      medicationId: 'med-1',
      recurrence: 'daily' as const,
      timeOfDay: '08:00',
      timezone: 'UTC',
      daysOfWeek: null,
      startDate: '2024-03-09',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Across typical US DST transition (March 10)
    const from = new Date('2024-03-09T00:00:00Z');
    const to = new Date('2024-03-12T00:00:00Z');

    const occurrences = generateOccurrences(schedule, from, to);
    expect(occurrences).toHaveLength(3);

    // All should be at exactly 08:00 UTC
    for (const occ of occurrences) {
      const dt = DateTime.fromJSDate(occ, { zone: 'UTC' });
      expect(dt.hour).toBe(8);
      expect(dt.minute).toBe(0);
    }
  });

  it('generates correct occurrences for Asia/Kolkata (no DST, +05:30)', () => {
    const schedule = {
      id: 'sched-1',
      medicationId: 'med-1',
      recurrence: 'daily' as const,
      timeOfDay: '09:00',
      timezone: 'Asia/Kolkata',
      daysOfWeek: null,
      startDate: '2024-12-01',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const from = new Date('2024-12-01T00:00:00Z');
    const to = new Date('2024-12-03T00:00:00Z');

    const occurrences = generateOccurrences(schedule, from, to);
    expect(occurrences).toHaveLength(2);

    // 09:00 IST = 03:30 UTC
    for (const occ of occurrences) {
      const dt = DateTime.fromJSDate(occ, { zone: 'UTC' });
      expect(dt.hour).toBe(3);
      expect(dt.minute).toBe(30);
    }
  });

  it('handles weekly schedule across DST transition', () => {
    // DST starts March 10, 2024 in America/New_York
    const schedule = {
      id: 'sched-1',
      medicationId: 'med-1',
      recurrence: 'weekly' as const,
      timeOfDay: '09:00',
      timezone: 'America/New_York',
      daysOfWeek: [6, 7], // Sat=6, Sun=7
      startDate: '2024-03-01',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // March 9 (Sat) is before DST, March 10 (Sun) is DST transition day
    const from = new Date('2024-03-09T00:00:00Z');
    const to = new Date('2024-03-11T00:00:00Z');

    const occurrences = generateOccurrences(schedule, from, to);
    expect(occurrences).toHaveLength(2);

    // March 9 (before DST): 09:00 EST = 14:00 UTC
    const march9 = occurrences.find((d) =>
      DateTime.fromJSDate(d, { zone: 'America/New_York' }).toISODate() === '2024-03-09'
    );
    expect(march9).toBeDefined();
    expect(DateTime.fromJSDate(march9!, { zone: 'UTC' }).hour).toBe(14);

    // March 10 (after DST): 09:00 EDT = 13:00 UTC
    const march10 = occurrences.find((d) =>
      DateTime.fromJSDate(d, { zone: 'America/New_York' }).toISODate() === '2024-03-10'
    );
    expect(march10).toBeDefined();
    expect(DateTime.fromJSDate(march10!, { zone: 'UTC' }).hour).toBe(13);
  });
});

describe('generateOccurrences - date boundaries', () => {
  it('handles year boundary crossing (Dec 31 to Jan 1)', () => {
    const schedule = {
      id: 'sched-1',
      medicationId: 'med-1',
      recurrence: 'daily' as const,
      timeOfDay: '12:00',
      timezone: 'UTC',
      daysOfWeek: null,
      startDate: '2024-12-30',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const from = new Date('2024-12-30T00:00:00Z');
    const to = new Date('2025-01-03T00:00:00Z');

    const occurrences = generateOccurrences(schedule, from, to);
    expect(occurrences).toHaveLength(4);

    const dates = occurrences.map((d) => DateTime.fromJSDate(d, { zone: 'UTC' }).toISODate());
    expect(dates).toEqual(['2024-12-30', '2024-12-31', '2025-01-01', '2025-01-02']);
  });

  it('handles leap year Feb 29 correctly', () => {
    const schedule = {
      id: 'sched-1',
      medicationId: 'med-1',
      recurrence: 'daily' as const,
      timeOfDay: '10:00',
      timezone: 'UTC',
      daysOfWeek: null,
      startDate: '2024-02-28',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 2024 is a leap year
    const from = new Date('2024-02-28T00:00:00Z');
    const to = new Date('2024-03-02T00:00:00Z');

    const occurrences = generateOccurrences(schedule, from, to);
    expect(occurrences).toHaveLength(3);

    const dates = occurrences.map((d) => DateTime.fromJSDate(d, { zone: 'UTC' }).toISODate());
    expect(dates).toEqual(['2024-02-28', '2024-02-29', '2024-03-01']);
  });

  it('stops generating occurrences after endDate', () => {
    const schedule = {
      id: 'sched-1',
      medicationId: 'med-1',
      recurrence: 'daily' as const,
      timeOfDay: '09:00',
      timezone: 'UTC',
      daysOfWeek: null,
      startDate: '2024-12-01',
      endDate: '2024-12-05',
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const from = new Date('2024-12-01T00:00:00Z');
    const to = new Date('2024-12-10T00:00:00Z');

    const occurrences = generateOccurrences(schedule, from, to);
    expect(occurrences).toHaveLength(5); // Dec 1-5

    const dates = occurrences.map((d) => DateTime.fromJSDate(d, { zone: 'UTC' }).toISODate());
    expect(dates).toEqual(['2024-12-01', '2024-12-02', '2024-12-03', '2024-12-04', '2024-12-05']);
  });

  it('excludes occurrences before startDate', () => {
    const schedule = {
      id: 'sched-1',
      medicationId: 'med-1',
      recurrence: 'daily' as const,
      timeOfDay: '09:00',
      timezone: 'UTC',
      daysOfWeek: null,
      startDate: '2024-12-05',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const from = new Date('2024-12-01T00:00:00Z');
    const to = new Date('2024-12-08T00:00:00Z');

    const occurrences = generateOccurrences(schedule, from, to);
    expect(occurrences).toHaveLength(3); // Dec 5, 6, 7

    const dates = occurrences.map((d) => DateTime.fromJSDate(d, { zone: 'UTC' }).toISODate());
    expect(dates).toEqual(['2024-12-05', '2024-12-06', '2024-12-07']);
  });

  it('returns empty when endDate is before window', () => {
    const schedule = {
      id: 'sched-1',
      medicationId: 'med-1',
      recurrence: 'daily' as const,
      timeOfDay: '09:00',
      timezone: 'UTC',
      daysOfWeek: null,
      startDate: '2024-11-01',
      endDate: '2024-11-30',
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const from = new Date('2024-12-01T00:00:00Z');
    const to = new Date('2024-12-10T00:00:00Z');

    const occurrences = generateOccurrences(schedule, from, to);
    expect(occurrences).toHaveLength(0);
  });

  it('returns empty when startDate is after window', () => {
    const schedule = {
      id: 'sched-1',
      medicationId: 'med-1',
      recurrence: 'daily' as const,
      timeOfDay: '09:00',
      timezone: 'UTC',
      daysOfWeek: null,
      startDate: '2025-01-01',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const from = new Date('2024-12-01T00:00:00Z');
    const to = new Date('2024-12-31T00:00:00Z');

    const occurrences = generateOccurrences(schedule, from, to);
    expect(occurrences).toHaveLength(0);
  });
});
