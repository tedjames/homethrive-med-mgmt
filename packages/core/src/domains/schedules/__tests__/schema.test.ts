/**
 * Schema validation tests for the Schedule domain.
 */

import { describe, expect, it } from 'vitest';

import { createScheduleInputSchema } from '../schema.js';

describe('createScheduleInputSchema', () => {
  it('accepts daily schedule without daysOfWeek', () => {
    const result = createScheduleInputSchema.safeParse({
      medicationId: '550e8400-e29b-41d4-a716-446655440000',
      recurrence: 'daily',
      timeOfDay: '09:00',
      timezone: 'America/New_York',
      startDate: '2024-12-01',
      endDate: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects daily schedule with daysOfWeek', () => {
    const result = createScheduleInputSchema.safeParse({
      medicationId: '550e8400-e29b-41d4-a716-446655440000',
      recurrence: 'daily',
      timeOfDay: '09:00',
      timezone: 'America/New_York',
      daysOfWeek: [1],
      startDate: '2024-12-01',
    });
    expect(result.success).toBe(false);
  });

  it('accepts weekly schedule with daysOfWeek', () => {
    const result = createScheduleInputSchema.safeParse({
      medicationId: '550e8400-e29b-41d4-a716-446655440000',
      recurrence: 'weekly',
      timeOfDay: '09:00',
      timezone: 'America/New_York',
      daysOfWeek: [1, 3, 5],
      startDate: '2024-12-01',
    });
    expect(result.success).toBe(true);
  });

  it('rejects weekly schedule without daysOfWeek', () => {
    const result = createScheduleInputSchema.safeParse({
      medicationId: '550e8400-e29b-41d4-a716-446655440000',
      recurrence: 'weekly',
      timeOfDay: '09:00',
      timezone: 'America/New_York',
      startDate: '2024-12-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid timeOfDay', () => {
    const result = createScheduleInputSchema.safeParse({
      medicationId: '550e8400-e29b-41d4-a716-446655440000',
      recurrence: 'daily',
      timeOfDay: '25:00',
      timezone: 'America/New_York',
      startDate: '2024-12-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid startDate', () => {
    const result = createScheduleInputSchema.safeParse({
      medicationId: '550e8400-e29b-41d4-a716-446655440000',
      recurrence: 'daily',
      timeOfDay: '09:00',
      timezone: 'America/New_York',
      startDate: '12/01/2024',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid timezone', () => {
    const result = createScheduleInputSchema.safeParse({
      medicationId: '550e8400-e29b-41d4-a716-446655440000',
      recurrence: 'daily',
      timeOfDay: '09:00',
      timezone: 'Not/AZone',
      startDate: '2024-12-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects endDate before startDate', () => {
    const result = createScheduleInputSchema.safeParse({
      medicationId: '550e8400-e29b-41d4-a716-446655440000',
      recurrence: 'daily',
      timeOfDay: '09:00',
      timezone: 'America/New_York',
      startDate: '2024-12-10',
      endDate: '2024-12-01',
    });
    expect(result.success).toBe(false);
  });
});
