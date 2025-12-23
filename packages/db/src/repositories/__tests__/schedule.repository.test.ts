import { getDb } from '../../connection.js';
import { users } from '../../schema/core.js';
import { createDbFactories } from '../../tests/factories.js';
import { DrizzleScheduleRepository } from '../schedule.repository.js';
import { describe, expect, it } from 'vitest';

describe('DrizzleScheduleRepository', () => {
  const db = getDb();
  const repo = new DrizzleScheduleRepository(db);
  const { createCareRecipient, createMedication } = createDbFactories(db);

  it('creates many schedules', async () => {
    await db.insert(users).values({ clerkUserId: 'user_1' });
    const r = await createCareRecipient('user_1', { displayName: 'Mom' });
    const m = await createMedication('user_1', r.id, { name: 'Med' });

    const schedules = await repo.createMany('user_1', [
      { medicationId: m.id, recurrence: 'daily', timeOfDay: '09:00', startDate: '2025-01-01' },
      { medicationId: m.id, recurrence: 'weekly', timeOfDay: '21:00', daysOfWeek: [1], startDate: '2025-01-01' },
    ]);

    expect(schedules).toHaveLength(2);
  });

  it('listByMedication returns only schedules for authorized user', async () => {
    await db.insert(users).values([{ clerkUserId: 'user_1' }, { clerkUserId: 'user_2' }]);
    const r1 = await createCareRecipient('user_1', { displayName: 'Mom' });
    const m1 = await createMedication('user_1', r1.id, { name: 'Med' });

    await repo.createMany('user_1', [
      { medicationId: m1.id, recurrence: 'daily', timeOfDay: '09:00', startDate: '2025-01-01' },
    ]);

    const list = await repo.listByMedication('user_1', m1.id);
    expect(list).toHaveLength(1);

    // Different user cannot see
    const listOther = await repo.listByMedication('user_2', m1.id);
    expect(listOther).toHaveLength(0);
  });

  it('listByRecipient filters by userId', async () => {
    await db.insert(users).values([{ clerkUserId: 'user_1' }, { clerkUserId: 'user_2' }]);
    const r1 = await createCareRecipient('user_1', { displayName: 'Mom' });
    const r2 = await createCareRecipient('user_2', { displayName: 'Dad' });
    const m1 = await createMedication('user_1', r1.id, { name: 'Med' });
    const m2 = await createMedication('user_2', r2.id, { name: 'Med2' });

    await repo.createMany('user_1', [
      { medicationId: m1.id, recurrence: 'daily', timeOfDay: '09:00', startDate: '2025-01-01' },
    ]);
    await repo.createMany('user_2', [
      { medicationId: m2.id, recurrence: 'daily', timeOfDay: '09:00', startDate: '2025-01-01' },
    ]);

    const list1 = await repo.listByRecipient('user_1', r1.id);
    expect(list1).toHaveLength(1);

    const list2 = await repo.listByRecipient('user_2', r2.id);
    expect(list2).toHaveLength(1);

    // Cross-user access should return empty
    const listCross = await repo.listByRecipient('user_1', r2.id);
    expect(listCross).toHaveLength(0);
  });
});
