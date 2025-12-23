import { getDb } from '../../connection.js';
import { DrizzleUserRepository } from '../user.repository.js';
import { describe, expect, it } from 'vitest';

describe('DrizzleUserRepository', () => {
  const db = getDb();
  const repo = new DrizzleUserRepository(db);

  it('upserts and preserves fields when undefined', async () => {
    const created = await repo.upsert({
      clerkUserId: 'user_1',
      email: 'user1@example.com',
      displayName: 'User One',
      imageUrl: 'https://example.com/u1.png',
    });

    expect(created.clerkUserId).toBe('user_1');
    expect(created.email).toBe('user1@example.com');
    expect(created.displayName).toBe('User One');
    expect(created.imageUrl).toBe('https://example.com/u1.png');

    const updated = await repo.upsert({
      clerkUserId: 'user_1',
      displayName: 'User One Updated',
    });

    expect(updated.clerkUserId).toBe('user_1');
    expect(updated.displayName).toBe('User One Updated');
    // Undefined fields should not overwrite existing values.
    expect(updated.email).toBe('user1@example.com');
    expect(updated.imageUrl).toBe('https://example.com/u1.png');

    const found = await repo.findByClerkUserId('user_1');
    expect(found).not.toBeNull();
    expect(found!.displayName).toBe('User One Updated');
  });
});

