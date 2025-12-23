/**
 * Service tests for the Schedule domain.
 */

import { describe, expect, it, vi } from 'vitest';

import type { UserId } from '../../../shared/types.js';
import { ScheduleNotFoundError } from '../errors.js';
import { createScheduleService } from '../service.js';
import type { ScheduleRepository } from '../repository.js';

function createRepoStub(overrides: Partial<ScheduleRepository> = {}): ScheduleRepository {
  return {
    findById: vi.fn(async () => null),
    listByMedication: vi.fn(async () => []),
    listByRecipient: vi.fn(async () => []),
    createMany: vi.fn(async () => []),
    ...overrides,
  };
}

describe('createScheduleService', () => {
  const userId: UserId = 'user_123';

  it('getById throws ScheduleNotFoundError when missing', async () => {
    const repo = createRepoStub({
      findById: vi.fn(async () => null),
    });

    const service = createScheduleService(repo);

    await expect(service.getById(userId, 'missing')).rejects.toBeInstanceOf(ScheduleNotFoundError);
  });

  it('listByMedication delegates to repo with userId', async () => {
    const repo = createRepoStub({
      listByMedication: vi.fn(async () => []),
    });

    const service = createScheduleService(repo);
    await service.listByMedication(userId, 'med-1');

    expect(repo.listByMedication).toHaveBeenCalledWith(userId, 'med-1');
  });

  it('createMany delegates to repo with userId', async () => {
    const scheduleInput = {
      medicationId: 'med-1',
      recurrence: 'daily' as const,
      timeOfDay: '09:00',
      startDate: '2024-12-01',
    };

    const repo = createRepoStub({
      createMany: vi.fn(async () => [{
        id: 'sched-1',
        medicationId: 'med-1',
        recurrence: 'daily' as const,
        timeOfDay: '09:00',
        timezone: null,
        daysOfWeek: null,
        startDate: '2024-12-01',
        endDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }]),
    });

    const service = createScheduleService(repo);
    const schedules = await service.createMany(userId, [scheduleInput]);

    expect(schedules).toHaveLength(1);
    expect(repo.createMany).toHaveBeenCalledWith(userId, [scheduleInput]);
  });

  it('createMany returns empty array when given empty input', async () => {
    const repo = createRepoStub({
      createMany: vi.fn(async () => []),
    });

    const service = createScheduleService(repo);
    const schedules = await service.createMany(userId, []);

    expect(schedules).toHaveLength(0);
    expect(repo.createMany).toHaveBeenCalledWith(userId, []);
  });

  it('listByRecipient delegates to repo with userId and recipientId', async () => {
    const repo = createRepoStub({
      listByRecipient: vi.fn(async () => []),
    });

    const service = createScheduleService(repo);
    await service.listByRecipient(userId, 'recipient-1');

    expect(repo.listByRecipient).toHaveBeenCalledWith(userId, 'recipient-1');
  });

  it('listByRecipient returns empty when no schedules exist', async () => {
    const repo = createRepoStub({
      listByRecipient: vi.fn(async () => []),
    });

    const service = createScheduleService(repo);
    const schedules = await service.listByRecipient(userId, 'recipient-1');

    expect(schedules).toHaveLength(0);
  });
});
