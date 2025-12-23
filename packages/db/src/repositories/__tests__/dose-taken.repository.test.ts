import { getDb } from '../../connection.js';
import { users } from '../../schema/core.js';
import { createDbFactories } from '../../tests/factories.js';
import { DrizzleDoseTakenRepository } from '../dose-taken.repository.js';
import { describe, expect, it } from 'vitest';

describe('DrizzleDoseTakenRepository', () => {
  const db = getDb();
  const repo = new DrizzleDoseTakenRepository(db);
  const { createCareRecipient, createMedication, createSchedules } = createDbFactories(db);

  it('markTaken is idempotent', async () => {
    await db.insert(users).values({ clerkUserId: 'user_1' });
    const r = await createCareRecipient('user_1', { displayName: 'Mom' });
    const m = await createMedication('user_1', r.id, { name: 'Aspirin' });
    const [s] = await createSchedules('user_1', [
      { medicationId: m.id, recurrence: 'daily', timeOfDay: '09:00', startDate: '2025-01-01' },
    ]);

    const scheduledFor = new Date('2025-01-01T14:00:00.000Z');
    const takenAt = new Date('2025-01-01T14:05:00.000Z');

    const first = await repo.markTaken('user_1', {
      recipientId: r.id,
      medicationId: m.id,
      scheduleId: s!.id,
      scheduledFor,
      takenAt,
      takenByUserId: 'user_1',
    });

    const second = await repo.markTaken('user_1', {
      recipientId: r.id,
      medicationId: m.id,
      scheduleId: s!.id,
      scheduledFor,
      takenAt,
      takenByUserId: 'user_1',
    });

    expect(first.id).toBe(second.id);
  });

  it('getTakenMap returns taken records for provided scheduleIds (caller filters by ownership)', async () => {
    // This test verifies the "trust-caller" authorization pattern:
    // The repository returns ALL taken records for the provided scheduleIds.
    // The caller (service layer) is responsible for only passing scheduleIds
    // that the user is authorized to access.
    await db.insert(users).values([{ clerkUserId: 'user_1' }, { clerkUserId: 'user_2' }]);
    const r1 = await createCareRecipient('user_1', { displayName: 'Mom' });
    const r2 = await createCareRecipient('user_2', { displayName: 'Dad' });
    const m1 = await createMedication('user_1', r1.id, { name: 'Aspirin' });
    const m2 = await createMedication('user_2', r2.id, { name: 'Ibuprofen' });

    const [s1] = await createSchedules('user_1', [
      { medicationId: m1.id, recurrence: 'daily', timeOfDay: '09:00', startDate: '2025-01-01' },
    ]);
    const [s2] = await createSchedules('user_2', [
      { medicationId: m2.id, recurrence: 'daily', timeOfDay: '09:00', startDate: '2025-01-01' },
    ]);

    const scheduledFor = new Date('2025-01-01T14:00:00.000Z');

    await repo.markTaken('user_1', {
      recipientId: r1.id,
      medicationId: m1.id,
      scheduleId: s1!.id,
      scheduledFor,
      takenAt: new Date(),
      takenByUserId: 'user_1',
    });

    await repo.markTaken('user_2', {
      recipientId: r2.id,
      medicationId: m2.id,
      scheduleId: s2!.id,
      scheduledFor,
      takenAt: new Date(),
      takenByUserId: 'user_2',
    });

    // User 1 queries only their own schedule (as the service layer would filter)
    const map1 = await repo.getTakenMap(
      'user_1',
      [s1!.id],
      new Date('2025-01-01T00:00:00.000Z'),
      new Date('2025-01-02T00:00:00.000Z')
    );

    expect(map1.size).toBe(1);
    const key1 = `${s1!.id}|${scheduledFor.toISOString()}`;
    expect(map1.has(key1)).toBe(true);

    // User 2 queries only their own schedule
    const map2 = await repo.getTakenMap(
      'user_2',
      [s2!.id],
      new Date('2025-01-01T00:00:00.000Z'),
      new Date('2025-01-02T00:00:00.000Z')
    );

    expect(map2.size).toBe(1);
    const key2 = `${s2!.id}|${scheduledFor.toISOString()}`;
    expect(map2.has(key2)).toBe(true);
  });

  it('getTakenMap with empty scheduleIds returns empty map', async () => {
    await db.insert(users).values({ clerkUserId: 'user_1' });
    const r = await createCareRecipient('user_1', { displayName: 'Mom' });
    const m = await createMedication('user_1', r.id, { name: 'Aspirin' });
    const [s] = await createSchedules('user_1', [
      { medicationId: m.id, recurrence: 'daily', timeOfDay: '09:00', startDate: '2025-01-01' },
    ]);

    const scheduledFor = new Date('2025-01-01T14:00:00.000Z');
    await repo.markTaken('user_1', {
      recipientId: r.id,
      medicationId: m.id,
      scheduleId: s!.id,
      scheduledFor,
      takenAt: new Date(),
      takenByUserId: 'user_1',
    });

    // Query with empty scheduleIds should return empty map
    const map = await repo.getTakenMap(
      'user_1',
      [],
      new Date('2025-01-01T00:00:00.000Z'),
      new Date('2025-01-02T00:00:00.000Z')
    );

    expect(map.size).toBe(0);
  });

  it('getTakenMap includes scheduledFor at from exactly (inclusive)', async () => {
    await db.insert(users).values({ clerkUserId: 'user_1' });
    const r = await createCareRecipient('user_1', { displayName: 'Mom' });
    const m = await createMedication('user_1', r.id, { name: 'Aspirin' });
    const [s] = await createSchedules('user_1', [
      { medicationId: m.id, recurrence: 'daily', timeOfDay: '09:00', startDate: '2025-01-01' },
    ]);

    // Mark dose at exactly the window start
    const exactlyAtFrom = new Date('2025-01-01T00:00:00.000Z');
    await repo.markTaken('user_1', {
      recipientId: r.id,
      medicationId: m.id,
      scheduleId: s!.id,
      scheduledFor: exactlyAtFrom,
      takenAt: new Date(),
      takenByUserId: 'user_1',
    });

    const map = await repo.getTakenMap(
      'user_1',
      [s!.id],
      new Date('2025-01-01T00:00:00.000Z'), // from = exactlyAtFrom
      new Date('2025-01-02T00:00:00.000Z')
    );

    // Should include the dose at exactly the window start
    expect(map.size).toBe(1);
    const key = `${s!.id}|${exactlyAtFrom.toISOString()}`;
    expect(map.has(key)).toBe(true);
  });

  it('getTakenMap excludes scheduledFor at to exactly (exclusive)', async () => {
    await db.insert(users).values({ clerkUserId: 'user_1' });
    const r = await createCareRecipient('user_1', { displayName: 'Mom' });
    const m = await createMedication('user_1', r.id, { name: 'Aspirin' });
    const [s] = await createSchedules('user_1', [
      { medicationId: m.id, recurrence: 'daily', timeOfDay: '09:00', startDate: '2025-01-01' },
    ]);

    // Mark dose at exactly the window end
    const exactlyAtTo = new Date('2025-01-02T00:00:00.000Z');
    await repo.markTaken('user_1', {
      recipientId: r.id,
      medicationId: m.id,
      scheduleId: s!.id,
      scheduledFor: exactlyAtTo,
      takenAt: new Date(),
      takenByUserId: 'user_1',
    });

    const map = await repo.getTakenMap(
      'user_1',
      [s!.id],
      new Date('2025-01-01T00:00:00.000Z'),
      new Date('2025-01-02T00:00:00.000Z') // to = exactlyAtTo
    );

    // Should exclude the dose at exactly the window end (half-open interval)
    expect(map.size).toBe(0);
  });

  it('markTaken same schedule different scheduledFor creates new record', async () => {
    await db.insert(users).values({ clerkUserId: 'user_1' });
    const r = await createCareRecipient('user_1', { displayName: 'Mom' });
    const m = await createMedication('user_1', r.id, { name: 'Aspirin' });
    const [s] = await createSchedules('user_1', [
      { medicationId: m.id, recurrence: 'daily', timeOfDay: '09:00', startDate: '2025-01-01' },
    ]);

    const scheduledFor1 = new Date('2025-01-01T14:00:00.000Z');
    const scheduledFor2 = new Date('2025-01-02T14:00:00.000Z');

    const first = await repo.markTaken('user_1', {
      recipientId: r.id,
      medicationId: m.id,
      scheduleId: s!.id,
      scheduledFor: scheduledFor1,
      takenAt: new Date('2025-01-01T14:05:00.000Z'),
      takenByUserId: 'user_1',
    });

    const second = await repo.markTaken('user_1', {
      recipientId: r.id,
      medicationId: m.id,
      scheduleId: s!.id,
      scheduledFor: scheduledFor2,
      takenAt: new Date('2025-01-02T14:10:00.000Z'),
      takenByUserId: 'user_1',
    });

    // Different scheduledFor should create separate records
    expect(first.id).not.toBe(second.id);
    expect(first.scheduledFor.toISOString()).toBe(scheduledFor1.toISOString());
    expect(second.scheduledFor.toISOString()).toBe(scheduledFor2.toISOString());
  });
});
