import { getDb } from '../../connection.js';
import { users } from '../../schema/core.js';
import { DrizzleCareRecipientRepository } from '../care-recipient.repository.js';
import { DrizzleMedicationRepository } from '../medication.repository.js';
import { describe, expect, it } from 'vitest';

describe('DrizzleMedicationRepository', () => {
  const db = getDb();
  const recipients = new DrizzleCareRecipientRepository(db);
  const repo = new DrizzleMedicationRepository(db);

  it('creates and lists by recipient', async () => {
    await db.insert(users).values({ clerkUserId: 'user_1' });
    const r = await recipients.create('user_1', { displayName: 'Mom' });

    const m1 = await repo.create('user_1', r.id, { name: 'Med 1' });
    await repo.create('user_1', r.id, { name: 'Med 2' });

    const list = await repo.listByRecipient('user_1', r.id);
    expect(list).toHaveLength(2);
    expect(list[0]!.id).toBe(m1.id);
  });

  it('returns null when userId does not match', async () => {
    await db.insert(users).values([{ clerkUserId: 'user_1' }, { clerkUserId: 'user_2' }]);
    const r = await recipients.create('user_1', { displayName: 'Mom' });
    const m = await repo.create('user_1', r.id, { name: 'Med' });

    // Different user cannot see medication
    const found = await repo.findById('user_2', m.id);
    expect(found).toBeNull();
  });

  it('filters inactive unless includeInactive=true', async () => {
    await db.insert(users).values({ clerkUserId: 'user_1' });
    const r = await recipients.create('user_1', { displayName: 'Mom' });

    const active = await repo.create('user_1', r.id, { name: 'Active' });
    const inactive = await repo.create('user_1', r.id, { name: 'Inactive' });
    await repo.setInactive('user_1', inactive.id, new Date('2025-01-01T00:00:00.000Z'));

    const onlyActive = await repo.listByRecipient('user_1', r.id);
    expect(onlyActive.map((m) => m.id)).toEqual([active.id]);

    const withInactive = await repo.listByRecipient('user_1', r.id, { includeInactive: true });
    expect(withInactive).toHaveLength(2);
  });

  it('updates and finds by id', async () => {
    await db.insert(users).values({ clerkUserId: 'user_1' });
    const r = await recipients.create('user_1', { displayName: 'Mom' });
    const m = await repo.create('user_1', r.id, { name: 'Old', instructions: 'Take it' });

    const updated = await repo.update('user_1', m.id, { name: 'New' });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('New');

    const found = await repo.findById('user_1', m.id);
    expect(found!.name).toBe('New');
  });

  it('createWithSchedules enforces atomicity', async () => {
    await db.insert(users).values({ clerkUserId: 'user_1' });
    const r = await recipients.create('user_1', { displayName: 'Mom' });

    const result = await repo.createWithSchedules(
      'user_1',
      r.id,
      { name: 'Aspirin', instructions: 'Take with food' },
      [
        { recurrence: 'daily', timeOfDay: '09:00', startDate: '2025-01-01' },
        { recurrence: 'weekly', timeOfDay: '21:00', daysOfWeek: [1, 3, 5], startDate: '2025-01-01' },
      ]
    );

    expect(result.medication.name).toBe('Aspirin');
    expect(result.schedules).toHaveLength(2);
    expect(result.schedules[0]!.medicationId).toBe(result.medication.id);
  });

  it('setInactive preserves other medication fields', async () => {
    await db.insert(users).values({ clerkUserId: 'user_1' });
    const r = await recipients.create('user_1', { displayName: 'Mom' });
    const m = await repo.create('user_1', r.id, {
      name: 'Aspirin',
      instructions: 'Take with food',
    });

    const inactiveAt = new Date('2025-06-01T12:00:00.000Z');
    const inactivated = await repo.setInactive('user_1', m.id, inactiveAt);

    expect(inactivated).not.toBeNull();
    expect(inactivated!.isActive).toBe(false);
    expect(inactivated!.inactiveAt!.toISOString()).toBe(inactiveAt.toISOString());
    // Other fields should be preserved
    expect(inactivated!.name).toBe('Aspirin');
    expect(inactivated!.instructions).toBe('Take with food');
    expect(inactivated!.recipientId).toBe(r.id);
  });

  it('setInactive called twice is idempotent', async () => {
    await db.insert(users).values({ clerkUserId: 'user_1' });
    const r = await recipients.create('user_1', { displayName: 'Mom' });
    const m = await repo.create('user_1', r.id, { name: 'Aspirin' });

    const firstInactiveAt = new Date('2025-06-01T12:00:00.000Z');
    const first = await repo.setInactive('user_1', m.id, firstInactiveAt);

    const secondInactiveAt = new Date('2025-06-02T12:00:00.000Z');
    const second = await repo.setInactive('user_1', m.id, secondInactiveAt);

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first!.id).toBe(second!.id);
    // Both should be inactive
    expect(first!.isActive).toBe(false);
    expect(second!.isActive).toBe(false);
    // Second call updates the inactiveAt timestamp
    expect(second!.inactiveAt!.toISOString()).toBe(secondInactiveAt.toISOString());
  });

  it('update returns null when userId does not own medication', async () => {
    await db.insert(users).values([{ clerkUserId: 'user_1' }, { clerkUserId: 'user_2' }]);
    const r = await recipients.create('user_1', { displayName: 'Mom' });
    const m = await repo.create('user_1', r.id, { name: 'Aspirin' });

    // User 2 tries to update User 1's medication
    const result = await repo.update('user_2', m.id, { name: 'Hacked' });
    expect(result).toBeNull();

    // Original medication should be unchanged
    const found = await repo.findById('user_1', m.id);
    expect(found!.name).toBe('Aspirin');
  });
});
