/**
 * Service tests for the Medication domain.
 */

import { describe, expect, it, vi } from 'vitest';

import type { UserId } from '../../../shared/types.js';
import type { CreateScheduleForMedicationInput } from '../../schedules/entity.js';
import { InactiveMedicationError, MedicationNotFoundError, MedicationRequiresScheduleError } from '../errors.js';
import { createMedicationService } from '../service.js';
import type { MedicationRepository } from '../repository.js';

function createRepoStub(overrides: Partial<MedicationRepository> = {}): MedicationRepository {
  return {
    findById: vi.fn(async () => null),
    listByRecipient: vi.fn(async () => []),
    create: vi.fn(async () => {
      throw new Error('not implemented');
    }),
    update: vi.fn(async () => null),
    setInactive: vi.fn(async () => null),
    setActive: vi.fn(async () => null),
    createWithSchedules: vi.fn(async () => {
      throw new Error('not implemented');
    }),
    ...overrides,
  };
}

describe('createMedicationService', () => {
  const userId: UserId = 'user_123';
  const recipientId = 'recipient-1';

  it('create throws MedicationRequiresScheduleError when schedules array is empty', async () => {
    const repo = createRepoStub();
    const service = createMedicationService(repo);

    await expect(
      service.create(userId, recipientId, { name: 'Aspirin' }, [])
    ).rejects.toBeInstanceOf(MedicationRequiresScheduleError);

    expect(repo.createWithSchedules).not.toHaveBeenCalled();
  });

  it('create calls createWithSchedules when schedules provided', async () => {
    const repo = createRepoStub({
      createWithSchedules: vi.fn(async (_uid, rid, medInput, schedules: CreateScheduleForMedicationInput[]) => ({
        medication: {
          id: 'med-1',
          recipientId: rid,
          name: medInput.name,
          instructions: null,
          isActive: true,
          inactiveAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        schedules: schedules.map((s, idx) => ({
          id: `schedule-${idx}`,
          medicationId: 'med-1',
          recurrence: s.recurrence,
          timeOfDay: s.timeOfDay,
          timezone: null,
          daysOfWeek: null,
          startDate: s.startDate,
          endDate: null,
          dosageNotes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      })),
    });

    const service = createMedicationService(repo);
    const medication = await service.create(
      userId,
      recipientId,
      { name: 'Aspirin' },
      [{ recurrence: 'daily', timeOfDay: '09:00', startDate: '2025-01-01' }]
    );

    expect(medication.id).toBe('med-1');
    expect(repo.createWithSchedules).toHaveBeenCalledTimes(1);
  });

  it('getById throws MedicationNotFoundError when missing', async () => {
    const repo = createRepoStub({
      findById: vi.fn(async () => null),
    });

    const service = createMedicationService(repo);

    await expect(service.getById(userId, 'missing')).rejects.toBeInstanceOf(MedicationNotFoundError);
  });

  it('setInactive throws MedicationNotFoundError when missing', async () => {
    const repo = createRepoStub({
      setInactive: vi.fn(async () => null),
    });

    const service = createMedicationService(repo);

    await expect(service.setInactive(userId, 'missing')).rejects.toBeInstanceOf(
      MedicationNotFoundError
    );
  });

  it('update throws MedicationNotFoundError when missing', async () => {
    const repo = createRepoStub({
      update: vi.fn(async () => null),
    });

    const service = createMedicationService(repo);

    await expect(service.update(userId, 'missing', { name: 'X' })).rejects.toBeInstanceOf(
      MedicationNotFoundError
    );
  });

  it('update throws InactiveMedicationError when medication is inactive', async () => {
    const repo = createRepoStub({
      findById: vi.fn(async () => ({
        id: 'med-1',
        recipientId: 'recipient-1',
        name: 'Aspirin',
        instructions: null,
        isActive: false,
        inactiveAt: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    });

    const service = createMedicationService(repo);

    await expect(service.update(userId, 'med-1', { name: 'New Name' })).rejects.toBeInstanceOf(
      InactiveMedicationError
    );
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('update throws InactiveMedicationError when isActive is false even without inactiveAt', async () => {
    const repo = createRepoStub({
      findById: vi.fn(async () => ({
        id: 'med-1',
        recipientId: 'recipient-1',
        name: 'Aspirin',
        instructions: null,
        isActive: false,
        inactiveAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    });

    const service = createMedicationService(repo);

    await expect(service.update(userId, 'med-1', { name: 'New Name' })).rejects.toBeInstanceOf(
      InactiveMedicationError
    );
  });

  it('getById returns NotFound when userId does not match owner', async () => {
    const repo = createRepoStub({
      findById: vi.fn(async (uid, id) => {
        if (uid !== 'owner_123' || id !== 'med-1') return null;
        return {
          id: 'med-1',
          recipientId: 'recipient-1',
          name: 'Aspirin',
          instructions: null,
          isActive: true,
          inactiveAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }),
    });

    const service = createMedicationService(repo);

    // Different user should not see the medication
    await expect(service.getById('other_user', 'med-1')).rejects.toBeInstanceOf(
      MedicationNotFoundError
    );
  });

  it('listByRecipient returns only active medications by default', async () => {
    const repo = createRepoStub({
      listByRecipient: vi.fn(async () => [
        {
          id: 'med-1',
          recipientId,
          name: 'Active Med',
          instructions: null,
          isActive: true,
          inactiveAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    });

    const service = createMedicationService(repo);
    const meds = await service.listByRecipient(userId, recipientId);

    expect(meds).toHaveLength(1);
    expect(repo.listByRecipient).toHaveBeenCalledWith(userId, recipientId, { includeInactive: false });
  });

  it('listByRecipient with includeInactive=true returns all medications', async () => {
    const repo = createRepoStub({
      listByRecipient: vi.fn(async () => [
        {
          id: 'med-1',
          recipientId,
          name: 'Active Med',
          instructions: null,
          isActive: true,
          inactiveAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'med-2',
          recipientId,
          name: 'Inactive Med',
          instructions: null,
          isActive: false,
          inactiveAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    });

    const service = createMedicationService(repo);
    const meds = await service.listByRecipient(userId, recipientId, true);

    expect(meds).toHaveLength(2);
    expect(repo.listByRecipient).toHaveBeenCalledWith(userId, recipientId, { includeInactive: true });
  });

  it('listByRecipient returns empty for recipient with no medications', async () => {
    const repo = createRepoStub({
      listByRecipient: vi.fn(async () => []),
    });

    const service = createMedicationService(repo);
    const meds = await service.listByRecipient(userId, recipientId);

    expect(meds).toHaveLength(0);
  });

  it('setInactive sets both isActive=false and inactiveAt timestamp', async () => {
    const inactiveAtValue = new Date('2024-12-05T12:00:00Z');
    const repo = createRepoStub({
      setInactive: vi.fn(async () => ({
        id: 'med-1',
        recipientId,
        name: 'Aspirin',
        instructions: null,
        isActive: false,
        inactiveAt: inactiveAtValue,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    });

    const service = createMedicationService(repo);
    const med = await service.setInactive(userId, 'med-1');

    expect(med.isActive).toBe(false);
    expect(med.inactiveAt).toEqual(inactiveAtValue);
    expect(repo.setInactive).toHaveBeenCalledWith(userId, 'med-1', expect.any(Date));
  });

  it('setInactive on already inactive medication is idempotent', async () => {
    const inactiveAtValue = new Date('2024-12-01T12:00:00Z');
    const repo = createRepoStub({
      setInactive: vi.fn(async () => ({
        id: 'med-1',
        recipientId,
        name: 'Aspirin',
        instructions: null,
        isActive: false,
        inactiveAt: inactiveAtValue,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    });

    const service = createMedicationService(repo);

    // Call setInactive twice
    const med1 = await service.setInactive(userId, 'med-1');
    const med2 = await service.setInactive(userId, 'med-1');

    // Both should succeed
    expect(med1.isActive).toBe(false);
    expect(med2.isActive).toBe(false);
  });
});
