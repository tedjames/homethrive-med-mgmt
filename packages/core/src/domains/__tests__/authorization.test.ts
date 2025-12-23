/**
 * Cross-domain authorization tests.
 *
 * These tests verify that the authorization model works correctly across all domains:
 * - User A cannot access User B's entities
 * - Repositories filter by userId and return null/empty for unauthorized access
 * - Services throw NotFoundError for unauthorized access (no information leakage)
 */

import { describe, expect, it, vi } from 'vitest';

import type { UserId } from '../../shared/types.js';

// Care Recipients
import { CareRecipientNotFoundError } from '../care-recipients/errors.js';
import { createCareRecipientService } from '../care-recipients/service.js';
import type { CareRecipientRepository } from '../care-recipients/repository.js';

// Medications
import { MedicationNotFoundError } from '../medications/errors.js';
import { createMedicationService } from '../medications/service.js';
import type { MedicationRepository } from '../medications/repository.js';

// Schedules
import { ScheduleNotFoundError } from '../schedules/errors.js';
import { createScheduleService } from '../schedules/service.js';
import type { ScheduleRepository } from '../schedules/repository.js';

// Doses
import { DoseNotFoundError } from '../doses/errors.js';
import { createDoseService } from '../doses/service.js';
import type { DoseTakenRepository } from '../doses/repository.js';
import { encodeDoseId } from '../doses/dose-id.js';

const USER_A: UserId = 'user_A';
const USER_B: UserId = 'user_B';

describe('Cross-Domain Authorization', () => {
  describe('Care Recipients', () => {
    function createCareRecipientRepoStub(
      overrides: Partial<CareRecipientRepository> = {}
    ): CareRecipientRepository {
      return {
        findById: vi.fn(async () => null),
        listForCaregiver: vi.fn(async () => []),
        create: vi.fn(async () => {
          throw new Error('not implemented');
        }),
        update: vi.fn(async () => null),
        ...overrides,
      };
    }

    it('User A cannot access User B care recipient via getById', async () => {
      const repo = createCareRecipientRepoStub({
        findById: vi.fn(async (userId, id) => {
          // Only return recipient if userId matches owner
          if (userId === USER_B && id === 'recipient-1') {
            return {
              id: 'recipient-1',
              createdByUserId: USER_B,
              displayName: 'Grandma',
              timezone: 'America/New_York',
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }
          return null;
        }),
      });

      const service = createCareRecipientService(repo);

      // User A tries to access User B's recipient
      await expect(service.getById(USER_A, 'recipient-1')).rejects.toBeInstanceOf(
        CareRecipientNotFoundError
      );

      // User B can access their own recipient
      const recipient = await service.getById(USER_B, 'recipient-1');
      expect(recipient.id).toBe('recipient-1');
    });

    it('User A cannot update User B care recipient', async () => {
      const repo = createCareRecipientRepoStub({
        update: vi.fn(async (userId, id) => {
          // Only allow update if userId matches owner
          if (userId === USER_B && id === 'recipient-1') {
            return {
              id: 'recipient-1',
              createdByUserId: USER_B,
              displayName: 'Updated Name',
              timezone: 'America/New_York',
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }
          return null;
        }),
      });

      const service = createCareRecipientService(repo);

      // User A tries to update User B's recipient
      await expect(
        service.update(USER_A, 'recipient-1', { displayName: 'Hacked' })
      ).rejects.toBeInstanceOf(CareRecipientNotFoundError);

      // User B can update their own recipient
      const updated = await service.update(USER_B, 'recipient-1', { displayName: 'Updated Name' });
      expect(updated.displayName).toBe('Updated Name');
    });

    it('listForCaregiver returns only own recipients', async () => {
      const repo = createCareRecipientRepoStub({
        listForCaregiver: vi.fn(async (userId) => {
          if (userId === USER_A) {
            return [
              {
                id: 'recipient-A',
                createdByUserId: USER_A,
                displayName: 'A Grandma',
                timezone: 'America/New_York',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ];
          }
          if (userId === USER_B) {
            return [
              {
                id: 'recipient-B',
                createdByUserId: USER_B,
                displayName: 'B Grandma',
                timezone: 'America/Chicago',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ];
          }
          return [];
        }),
      });

      const service = createCareRecipientService(repo);

      const aRecipients = await service.listForCaregiver(USER_A);
      const bRecipients = await service.listForCaregiver(USER_B);

      expect(aRecipients).toHaveLength(1);
      expect(aRecipients[0]!.id).toBe('recipient-A');

      expect(bRecipients).toHaveLength(1);
      expect(bRecipients[0]!.id).toBe('recipient-B');
    });
  });

  describe('Medications', () => {
    function createMedicationRepoStub(
      overrides: Partial<MedicationRepository> = {}
    ): MedicationRepository {
      return {
        findById: vi.fn(async () => null),
        listByRecipient: vi.fn(async () => []),
        create: vi.fn(async () => {
          throw new Error('not implemented');
        }),
        update: vi.fn(async () => null),
        setInactive: vi.fn(async () => null),
        createWithSchedules: vi.fn(async () => {
          throw new Error('not implemented');
        }),
        ...overrides,
      };
    }

    it('User A cannot access User B medication via getById', async () => {
      const repo = createMedicationRepoStub({
        findById: vi.fn(async (userId, id) => {
          if (userId === USER_B && id === 'med-1') {
            return {
              id: 'med-1',
              recipientId: 'recipient-B',
              name: 'Aspirin',
              instructions: null,
              isActive: true,
              inactiveAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }
          return null;
        }),
      });

      const service = createMedicationService(repo);

      await expect(service.getById(USER_A, 'med-1')).rejects.toBeInstanceOf(
        MedicationNotFoundError
      );

      const med = await service.getById(USER_B, 'med-1');
      expect(med.id).toBe('med-1');
    });

    it('User A cannot setInactive User B medication', async () => {
      const repo = createMedicationRepoStub({
        setInactive: vi.fn(async (userId, id) => {
          if (userId === USER_B && id === 'med-1') {
            return {
              id: 'med-1',
              recipientId: 'recipient-B',
              name: 'Aspirin',
              instructions: null,
              isActive: false,
              inactiveAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }
          return null;
        }),
      });

      const service = createMedicationService(repo);

      await expect(service.setInactive(USER_A, 'med-1')).rejects.toBeInstanceOf(
        MedicationNotFoundError
      );

      const med = await service.setInactive(USER_B, 'med-1');
      expect(med.isActive).toBe(false);
    });

    it('listByRecipient returns empty for unauthorized recipient', async () => {
      const repo = createMedicationRepoStub({
        listByRecipient: vi.fn(async (userId, recipientId) => {
          // Only return medications if user owns the recipient
          if (userId === USER_B && recipientId === 'recipient-B') {
            return [
              {
                id: 'med-1',
                recipientId: 'recipient-B',
                name: 'Aspirin',
                instructions: null,
                isActive: true,
                inactiveAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ];
          }
          return [];
        }),
      });

      const service = createMedicationService(repo);

      // User A tries to list medications for User B's recipient
      const aMeds = await service.listByRecipient(USER_A, 'recipient-B');
      expect(aMeds).toHaveLength(0);

      // User B can list their own medications
      const bMeds = await service.listByRecipient(USER_B, 'recipient-B');
      expect(bMeds).toHaveLength(1);
    });
  });

  describe('Schedules', () => {
    function createScheduleRepoStub(
      overrides: Partial<ScheduleRepository> = {}
    ): ScheduleRepository {
      return {
        findById: vi.fn(async () => null),
        listByMedication: vi.fn(async () => []),
        listByRecipient: vi.fn(async () => []),
        createMany: vi.fn(async () => []),
        ...overrides,
      };
    }

    it('User A cannot access User B schedule via getById', async () => {
      const repo = createScheduleRepoStub({
        findById: vi.fn(async (userId, id) => {
          if (userId === USER_B && id === 'sched-1') {
            return {
              id: 'sched-1',
              medicationId: 'med-1',
              recurrence: 'daily' as const,
              timeOfDay: '09:00',
              timezone: null,
              daysOfWeek: null,
              startDate: '2024-01-01',
              endDate: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }
          return null;
        }),
      });

      const service = createScheduleService(repo);

      await expect(service.getById(USER_A, 'sched-1')).rejects.toBeInstanceOf(
        ScheduleNotFoundError
      );

      const schedule = await service.getById(USER_B, 'sched-1');
      expect(schedule.id).toBe('sched-1');
    });
  });

  describe('Doses', () => {
    function createScheduleRepoStub(
      overrides: Partial<ScheduleRepository> = {}
    ): ScheduleRepository {
      return {
        findById: vi.fn(async () => null),
        listByMedication: vi.fn(async () => []),
        listByRecipient: vi.fn(async () => []),
        createMany: vi.fn(async () => []),
        ...overrides,
      };
    }

    function createDoseTakenRepoStub(
      overrides: Partial<DoseTakenRepository> = {}
    ): DoseTakenRepository {
      return {
        markTaken: vi.fn(async () => {
          throw new Error('not implemented');
        }),
        getTakenMap: vi.fn(async () => new Map()),
        ...overrides,
      };
    }

    function createMedicationRepoStub(
      overrides: Partial<MedicationRepository> = {}
    ): MedicationRepository {
      return {
        findById: vi.fn(async () => null),
        listByRecipient: vi.fn(async () => []),
        create: vi.fn(async () => {
          throw new Error('not implemented');
        }),
        update: vi.fn(async () => null),
        setInactive: vi.fn(async () => null),
        createWithSchedules: vi.fn(async () => {
          throw new Error('not implemented');
        }),
        ...overrides,
      };
    }

    it('User A cannot markTaken for User B dose', async () => {
      const scheduleRepo = createScheduleRepoStub({
        findById: vi.fn(async (userId, id) => {
          // Only User B owns this schedule
          if (userId === USER_B && id === 'sched-1') {
            return {
              id: 'sched-1',
              medicationId: 'med-1',
              recurrence: 'daily' as const,
              timeOfDay: '09:00',
              timezone: null,
              daysOfWeek: null,
              startDate: '2024-01-01',
              endDate: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }
          return null;
        }),
      });

      const doseTakenRepo = createDoseTakenRepoStub();
      const medicationRepo = createMedicationRepoStub();

      const service = createDoseService(scheduleRepo, doseTakenRepo, medicationRepo);

      const scheduledFor = new Date('2024-06-15T09:00:00.000Z');
      const doseId = encodeDoseId('sched-1', scheduledFor);

      // User A tries to mark User B's dose as taken
      await expect(service.markTaken(USER_A, doseId)).rejects.toBeInstanceOf(DoseNotFoundError);

      // Verify markTaken was never called on the repository
      expect(doseTakenRepo.markTaken).not.toHaveBeenCalled();
    });

    it('listUpcomingDoses returns empty for unauthorized recipient', async () => {
      const scheduleRepo = createScheduleRepoStub({
        listByRecipient: vi.fn(async (userId, recipientId) => {
          // Only User B has schedules for recipient-B
          if (userId === USER_B && recipientId === 'recipient-B') {
            return [
              {
                id: 'sched-1',
                medicationId: 'med-1',
                recurrence: 'daily' as const,
                timeOfDay: '09:00',
                timezone: 'America/New_York',
                daysOfWeek: null,
                startDate: '2024-01-01',
                endDate: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ];
          }
          return [];
        }),
      });

      const medicationRepo = createMedicationRepoStub({
        listByRecipient: vi.fn(async (userId, recipientId) => {
          if (userId === USER_B && recipientId === 'recipient-B') {
            return [
              {
                id: 'med-1',
                recipientId: 'recipient-B',
                name: 'Aspirin',
                instructions: null,
                isActive: true,
                inactiveAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ];
          }
          return [];
        }),
      });

      const doseTakenRepo = createDoseTakenRepoStub();

      const fixedNow = new Date('2024-06-15T08:00:00.000Z');
      const service = createDoseService(scheduleRepo, doseTakenRepo, medicationRepo, {
        now: () => fixedNow,
      });

      // User A tries to list doses for User B's recipient
      const aDoses = await service.listUpcomingDoses(USER_A, 'recipient-B');
      expect(aDoses).toHaveLength(0);

      // User B can list their own doses
      const bDoses = await service.listUpcomingDoses(USER_B, 'recipient-B');
      expect(bDoses.length).toBeGreaterThan(0);
    });
  });
});
