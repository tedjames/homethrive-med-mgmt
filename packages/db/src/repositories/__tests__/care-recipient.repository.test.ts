import { getDb } from '../../connection.js';
import { users } from '../../schema/core.js';
import { DrizzleCareRecipientRepository } from '../care-recipient.repository.js';
import { describe, expect, it } from 'vitest';

describe('DrizzleCareRecipientRepository', () => {
  const db = getDb();
  const repo = new DrizzleCareRecipientRepository(db);

  it('creates and finds by id', async () => {
    await db.insert(users).values({ clerkUserId: 'user_1' });
    const created = await repo.create('user_1', {
      displayName: 'Mom',
      timezone: 'America/New_York',
    });

    const found = await repo.findById('user_1', created.id);
    expect(found).not.toBeNull();
    expect(found!.displayName).toBe('Mom');
    expect(found!.createdByUserId).toBe('user_1');
  });

  it('returns null when userId does not match', async () => {
    await db.insert(users).values([{ clerkUserId: 'user_1' }, { clerkUserId: 'user_2' }]);
    const created = await repo.create('user_1', {
      displayName: 'Mom',
      timezone: 'America/New_York',
    });

    // Different user should not see the recipient
    const found = await repo.findById('user_2', created.id);
    expect(found).toBeNull();
  });

  it('lists for caregiver', async () => {
    await db.insert(users).values([{ clerkUserId: 'user_1' }, { clerkUserId: 'user_2' }]);
    await repo.create('user_1', { displayName: 'A' });
    await repo.create('user_1', { displayName: 'B' });
    await repo.create('user_2', { displayName: 'C' });

    const list = await repo.listForCaregiver('user_1');
    expect(list).toHaveLength(2);
    expect(list.map((r) => r.displayName)).toEqual(['A', 'B']);
  });

  it('updates and returns null if missing or unauthorized', async () => {
    await db.insert(users).values([{ clerkUserId: 'user_1' }, { clerkUserId: 'user_2' }]);
    const created = await repo.create('user_1', { displayName: 'Old' });
    const updated = await repo.update('user_1', created.id, { displayName: 'New' });

    expect(updated).not.toBeNull();
    expect(updated!.displayName).toBe('New');

    // Different user cannot update
    const unauthorized = await repo.update('user_2', created.id, { displayName: 'Nope' });
    expect(unauthorized).toBeNull();

    const missing = await repo.update('user_1', '00000000-0000-0000-0000-000000000000', {
      displayName: 'Nope',
    });
    expect(missing).toBeNull();
  });
});
