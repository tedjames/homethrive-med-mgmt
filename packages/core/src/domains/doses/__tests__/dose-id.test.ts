/**
 * Dose ID encoding/decoding tests.
 */

import { describe, expect, it } from 'vitest';

import { decodeDoseId, encodeDoseId } from '../dose-id.js';
import { InvalidDoseIdError } from '../errors.js';

describe('encodeDoseId/decodeDoseId', () => {
  it('round-trips scheduleId and scheduledFor', () => {
    const scheduledFor = new Date('2024-12-19T14:00:00.000Z');
    const doseId = encodeDoseId('schedule-1', scheduledFor);

    const decoded = decodeDoseId(doseId);

    expect(decoded.scheduleId).toBe('schedule-1');
    expect(decoded.scheduledFor.toISOString()).toBe('2024-12-19T14:00:00.000Z');
  });

  it('is URL-safe (no +, /, =)', () => {
    const doseId = encodeDoseId('schedule-1', new Date('2024-12-19T14:00:00.000Z'));
    expect(doseId).toMatch(/^v1:[A-Za-z0-9_-]+$/);
  });

  it('rejects missing v1 prefix', () => {
    expect(() => decodeDoseId('abc')).toThrow(InvalidDoseIdError);
  });

  it('rejects invalid payload', () => {
    expect(() => decodeDoseId('v1:@@@')).toThrow(InvalidDoseIdError);
  });

  it('handles scheduleId with base64 special characters (equals, plus, slash)', () => {
    // Note: scheduleId cannot contain '|' as it's the internal delimiter.
    // In practice, scheduleIds are database-generated UUIDs so this isn't an issue.
    // These characters (+, /, =) could cause issues with base64 encoding/decoding.
    const specialId = 'schedule/with=special+chars';
    const scheduledFor = new Date('2024-06-15T10:00:00.000Z');
    const doseId = encodeDoseId(specialId, scheduledFor);

    const decoded = decodeDoseId(doseId);

    expect(decoded.scheduleId).toBe(specialId);
    expect(decoded.scheduledFor.toISOString()).toBe('2024-06-15T10:00:00.000Z');
  });

  it('handles scheduledFor at Unix epoch (1970-01-01)', () => {
    const epoch = new Date('1970-01-01T00:00:00.000Z');
    const doseId = encodeDoseId('schedule-epoch', epoch);

    const decoded = decodeDoseId(doseId);

    expect(decoded.scheduleId).toBe('schedule-epoch');
    expect(decoded.scheduledFor.toISOString()).toBe('1970-01-01T00:00:00.000Z');
  });

  it('handles scheduledFor far in future (year 2100)', () => {
    const future = new Date('2100-12-31T23:59:59.999Z');
    const doseId = encodeDoseId('schedule-future', future);

    const decoded = decodeDoseId(doseId);

    expect(decoded.scheduleId).toBe('schedule-future');
    expect(decoded.scheduledFor.toISOString()).toBe('2100-12-31T23:59:59.999Z');
  });
});
