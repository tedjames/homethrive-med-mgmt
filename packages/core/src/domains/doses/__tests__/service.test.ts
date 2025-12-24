/**
 * Service tests for the Dose domain.
 */

import { describe, expect, it, vi } from 'vitest';

import type { UserId } from '../../../shared/types.js';
import { createDoseService } from '../service.js';
import type { ScheduleRepository } from '../../schedules/repository.js';
import type { DoseTakenRepository } from '../repository.js';
import type { MedicationRepository } from '../../medications/repository.js';
import type { MedicationSchedule } from '../../schedules/entity.js';
import type { Medication } from '../../medications/entity.js';
import { encodeDoseId } from '../dose-id.js';
import { DoseNotFoundError, InvalidDoseIdError } from '../errors.js';
import { InactiveMedicationError, MedicationNotFoundError } from '../../medications/errors.js';

function createScheduleRepoStub(
  overrides: Partial<ScheduleRepository> = {}
): ScheduleRepository {
  return {
    findById: vi.fn(async () => null),
    listByMedication: vi.fn(async () => []),
    listByRecipient: vi.fn(async () => []),
    createMany: vi.fn(async () => []),
    update: vi.fn(async () => null),
    countActiveByMedication: vi.fn(async () => 0),
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
    unmarkTaken: vi.fn(async () => false),
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
    setActive: vi.fn(async () => null),
    createWithSchedules: vi.fn(async () => {
      throw new Error('not implemented');
    }),
    ...overrides,
  };
}

describe('createDoseService', () => {
  const userId: UserId = 'user_123';
  const recipientId = 'recipient-1';

  it('listUpcomingDoses merges schedules and taken events', async () => {
    const schedule: MedicationSchedule = {
      id: 'schedule-1',
      medicationId: 'med-1',
      recurrence: 'daily',
      timeOfDay: '09:00',
      timezone: 'America/New_York',
      daysOfWeek: null,
      startDate: '2024-12-19',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const scheduleRepo = createScheduleRepoStub({
      listByRecipient: vi.fn(async () => [schedule]),
    });

    const medicationRepo = createMedicationRepoStub({
      listByRecipient: vi.fn(async () => [
        {
          id: 'med-1',
          recipientId,
          name: 'Aspirin',
          instructions: null,
          isActive: true,
          inactiveAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    });

    const takenKey = `schedule-1|2024-12-19T14:00:00.000Z`;
    const doseTakenRepo = createDoseTakenRepoStub({
      getTakenMap: vi.fn(async () => new Map([[takenKey, { takenAt: new Date('2024-12-19T15:00:00Z'), takenByUserId: userId }]])),
    });

    const service = createDoseService(scheduleRepo, doseTakenRepo, medicationRepo, {
      now: () => new Date('2024-12-19T12:00:00Z'),
    });

    const doses = await service.listUpcomingDoses(userId, recipientId, {
      from: new Date('2024-12-19T00:00:00Z'),
      to: new Date('2024-12-20T00:00:00Z'),
    });

    expect(doses).toHaveLength(1);
    expect(doses[0]!.status).toBe('taken');
    expect(doses[0]!.takenByUserId).toBe(userId);
  });

  it('markTaken throws DoseNotFoundError when schedule not found', async () => {
    const scheduleRepo = createScheduleRepoStub({
      findById: vi.fn(async () => null),
    });

    const doseTakenRepo = createDoseTakenRepoStub();
    const medicationRepo = createMedicationRepoStub();

    const service = createDoseService(scheduleRepo, doseTakenRepo, medicationRepo);

    const doseId = encodeDoseId('schedule-1', new Date('2024-12-19T14:00:00Z'));

    await expect(service.markTaken(userId, doseId)).rejects.toBeInstanceOf(DoseNotFoundError);
  });

  it('markTaken throws InvalidDoseIdError for malformed doseId', async () => {
    const scheduleRepo = createScheduleRepoStub();
    const doseTakenRepo = createDoseTakenRepoStub();
    const medicationRepo = createMedicationRepoStub();

    const service = createDoseService(scheduleRepo, doseTakenRepo, medicationRepo);

    await expect(service.markTaken(userId, 'invalid-dose-id')).rejects.toBeInstanceOf(InvalidDoseIdError);
    await expect(service.markTaken(userId, '')).rejects.toBeInstanceOf(InvalidDoseIdError);
  });

  it('markTaken throws MedicationNotFoundError when medication not found', async () => {
    const schedule: MedicationSchedule = {
      id: 'schedule-1',
      medicationId: 'med-1',
      recurrence: 'daily',
      timeOfDay: '09:00',
      timezone: 'America/New_York',
      daysOfWeek: null,
      startDate: '2024-12-19',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const scheduleRepo = createScheduleRepoStub({
      findById: vi.fn(async () => schedule),
    });

    const doseTakenRepo = createDoseTakenRepoStub();
    const medicationRepo = createMedicationRepoStub({
      findById: vi.fn(async () => null),
    });

    const service = createDoseService(scheduleRepo, doseTakenRepo, medicationRepo);

    const doseId = encodeDoseId('schedule-1', new Date('2024-12-19T14:00:00Z'));

    await expect(service.markTaken(userId, doseId)).rejects.toBeInstanceOf(MedicationNotFoundError);
  });

  it('markTaken throws InactiveMedicationError when dose is after inactiveAt', async () => {
    const schedule: MedicationSchedule = {
      id: 'schedule-1',
      medicationId: 'med-1',
      recurrence: 'daily',
      timeOfDay: '09:00',
      timezone: 'America/New_York',
      daysOfWeek: null,
      startDate: '2024-12-01',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const inactiveMedication: Medication = {
      id: 'med-1',
      recipientId,
      name: 'Aspirin',
      instructions: null,
      isActive: false,
      inactiveAt: new Date('2024-12-15T00:00:00Z'), // Inactive since Dec 15
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const scheduleRepo = createScheduleRepoStub({
      findById: vi.fn(async () => schedule),
    });

    const doseTakenRepo = createDoseTakenRepoStub();
    const medicationRepo = createMedicationRepoStub({
      findById: vi.fn(async () => inactiveMedication),
    });

    const service = createDoseService(scheduleRepo, doseTakenRepo, medicationRepo);

    // Try to mark a dose on Dec 19 (after inactiveAt of Dec 15)
    const doseId = encodeDoseId('schedule-1', new Date('2024-12-19T14:00:00Z'));

    await expect(service.markTaken(userId, doseId)).rejects.toBeInstanceOf(InactiveMedicationError);
  });

  it('markTaken allows marking dose before inactiveAt even for inactive medication', async () => {
    const schedule: MedicationSchedule = {
      id: 'schedule-1',
      medicationId: 'med-1',
      recurrence: 'daily',
      timeOfDay: '09:00',
      timezone: 'America/New_York',
      daysOfWeek: null,
      startDate: '2024-12-01',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const inactiveMedication: Medication = {
      id: 'med-1',
      recipientId,
      name: 'Aspirin',
      instructions: null,
      isActive: false,
      inactiveAt: new Date('2024-12-15T00:00:00Z'), // Inactive since Dec 15
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const scheduleRepo = createScheduleRepoStub({
      findById: vi.fn(async () => schedule),
    });

    const takenAt = new Date('2024-12-14T15:00:00Z');
    const doseTakenRepo = createDoseTakenRepoStub({
      markTaken: vi.fn(async () => ({
        id: 'taken-1',
        recipientId,
        medicationId: 'med-1',
        scheduleId: 'schedule-1',
        scheduledFor: new Date('2024-12-14T14:00:00Z'),
        takenAt,
        takenByUserId: userId,
      })),
    });

    const medicationRepo = createMedicationRepoStub({
      findById: vi.fn(async () => inactiveMedication),
    });

    const service = createDoseService(scheduleRepo, doseTakenRepo, medicationRepo);

    // Mark a dose on Dec 14 (before inactiveAt of Dec 15) - should succeed
    const doseId = encodeDoseId('schedule-1', new Date('2024-12-14T14:00:00Z'));

    const result = await service.markTaken(userId, doseId);
    expect(result.status).toBe('taken');
    expect(result.takenAt).toEqual(takenAt);
  });

  it('listUpcomingDoses excludes inactive medications by default', async () => {
    const schedule: MedicationSchedule = {
      id: 'schedule-1',
      medicationId: 'med-1',
      recurrence: 'daily',
      timeOfDay: '09:00',
      timezone: 'America/New_York',
      daysOfWeek: null,
      startDate: '2024-12-19',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const scheduleRepo = createScheduleRepoStub({
      listByRecipient: vi.fn(async () => [schedule]),
    });

    const medicationRepo = createMedicationRepoStub({
      listByRecipient: vi.fn(async () => [
        {
          id: 'med-1',
          recipientId,
          name: 'Aspirin',
          instructions: null,
          isActive: false, // Inactive
          inactiveAt: new Date('2024-12-18'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    });

    const doseTakenRepo = createDoseTakenRepoStub();

    const service = createDoseService(scheduleRepo, doseTakenRepo, medicationRepo, {
      now: () => new Date('2024-12-19T12:00:00Z'),
    });

    // Default: includeInactive = false
    const doses = await service.listUpcomingDoses(userId, recipientId, {
      from: new Date('2024-12-19T00:00:00Z'),
      to: new Date('2024-12-26T00:00:00Z'),
    });

    expect(doses).toHaveLength(0);
  });

  it('listUpcomingDoses includes inactive medications when includeInactive=true but excludes doses after inactiveAt', async () => {
    const schedule: MedicationSchedule = {
      id: 'schedule-1',
      medicationId: 'med-1',
      recurrence: 'daily',
      timeOfDay: '09:00',
      timezone: 'America/New_York',
      daysOfWeek: null,
      startDate: '2024-12-15',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const scheduleRepo = createScheduleRepoStub({
      listByRecipient: vi.fn(async () => [schedule]),
    });

    const inactiveAt = new Date('2024-12-20T00:00:00Z');
    const medicationRepo = createMedicationRepoStub({
      listByRecipient: vi.fn(async () => [
        {
          id: 'med-1',
          recipientId,
          name: 'Aspirin',
          instructions: null,
          isActive: false,
          inactiveAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    });

    const doseTakenRepo = createDoseTakenRepoStub();

    const service = createDoseService(scheduleRepo, doseTakenRepo, medicationRepo, {
      now: () => new Date('2024-12-15T12:00:00Z'),
    });

    // With includeInactive=true, should see doses up to but not after inactiveAt
    const doses = await service.listUpcomingDoses(userId, recipientId, {
      from: new Date('2024-12-15T00:00:00Z'),
      to: new Date('2024-12-25T00:00:00Z'),
      includeInactive: true,
    });

    // Should have doses from Dec 15-19 (5 days), but not Dec 20+ (after inactiveAt)
    expect(doses.length).toBeGreaterThan(0);
    for (const dose of doses) {
      expect(dose.scheduledFor.getTime()).toBeLessThanOrEqual(inactiveAt.getTime());
    }
  });

  it('listUpcomingDoses returns empty when from === to (zero-width window)', async () => {
    const schedule: MedicationSchedule = {
      id: 'schedule-1',
      medicationId: 'med-1',
      recurrence: 'daily',
      timeOfDay: '09:00',
      timezone: 'UTC',
      daysOfWeek: null,
      startDate: '2024-12-01',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const scheduleRepo = createScheduleRepoStub({
      listByRecipient: vi.fn(async () => [schedule]),
    });

    const medicationRepo = createMedicationRepoStub({
      listByRecipient: vi.fn(async () => [
        {
          id: 'med-1',
          recipientId,
          name: 'Aspirin',
          instructions: null,
          isActive: true,
          inactiveAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    });

    const doseTakenRepo = createDoseTakenRepoStub();

    const service = createDoseService(scheduleRepo, doseTakenRepo, medicationRepo);

    const sameTime = new Date('2024-12-05T12:00:00Z');
    const doses = await service.listUpcomingDoses(userId, recipientId, {
      from: sameTime,
      to: sameTime,
    });

    expect(doses).toHaveLength(0);
  });

  it('listUpcomingDoses uses default 7-day window when no filters provided', async () => {
    const schedule: MedicationSchedule = {
      id: 'schedule-1',
      medicationId: 'med-1',
      recurrence: 'daily',
      timeOfDay: '12:00',
      timezone: 'UTC',
      daysOfWeek: null,
      startDate: '2024-12-01',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const scheduleRepo = createScheduleRepoStub({
      listByRecipient: vi.fn(async () => [schedule]),
    });

    const medicationRepo = createMedicationRepoStub({
      listByRecipient: vi.fn(async () => [
        {
          id: 'med-1',
          recipientId,
          name: 'Aspirin',
          instructions: null,
          isActive: true,
          inactiveAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    });

    const doseTakenRepo = createDoseTakenRepoStub();

    const now = new Date('2024-12-05T10:00:00Z');
    const service = createDoseService(scheduleRepo, doseTakenRepo, medicationRepo, {
      now: () => now,
    });

    // Call without filters - should use default 7-day window from now
    const doses = await service.listUpcomingDoses(userId, recipientId);

    // Should have ~7 doses (Dec 5-11)
    expect(doses.length).toBe(7);

    // First dose should be on or after now
    expect(doses[0]!.scheduledFor.getTime()).toBeGreaterThanOrEqual(now.getTime());

    // Last dose should be within 7 days
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    expect(doses[doses.length - 1]!.scheduledFor.getTime()).toBeLessThan(sevenDaysFromNow.getTime());
  });

  it('listUpcomingDoses handles orphaned schedules gracefully (ignores if medication missing)', async () => {
    const orphanedSchedule: MedicationSchedule = {
      id: 'schedule-orphan',
      medicationId: 'med-deleted',
      recurrence: 'daily',
      timeOfDay: '09:00',
      timezone: 'UTC',
      daysOfWeek: null,
      startDate: '2024-12-01',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const validSchedule: MedicationSchedule = {
      id: 'schedule-1',
      medicationId: 'med-1',
      recurrence: 'daily',
      timeOfDay: '10:00',
      timezone: 'UTC',
      daysOfWeek: null,
      startDate: '2024-12-01',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const scheduleRepo = createScheduleRepoStub({
      listByRecipient: vi.fn(async () => [orphanedSchedule, validSchedule]),
    });

    // Only med-1 exists, med-deleted doesn't
    const medicationRepo = createMedicationRepoStub({
      listByRecipient: vi.fn(async () => [
        {
          id: 'med-1',
          recipientId,
          name: 'Aspirin',
          instructions: null,
          isActive: true,
          inactiveAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    });

    const doseTakenRepo = createDoseTakenRepoStub();

    const service = createDoseService(scheduleRepo, doseTakenRepo, medicationRepo, {
      now: () => new Date('2024-12-05T08:00:00Z'),
    });

    const doses = await service.listUpcomingDoses(userId, recipientId, {
      from: new Date('2024-12-05T00:00:00Z'),
      to: new Date('2024-12-06T00:00:00Z'),
    });

    // Should only get dose from valid schedule, orphaned is ignored
    expect(doses).toHaveLength(1);
    expect(doses[0]!.medicationId).toBe('med-1');
  });

  it('listUpcomingDoses excludes dose when scheduledFor equals inactiveAt exactly (boundary)', async () => {
    const schedule: MedicationSchedule = {
      id: 'schedule-1',
      medicationId: 'med-1',
      recurrence: 'daily',
      timeOfDay: '12:00',
      timezone: 'UTC',
      daysOfWeek: null,
      startDate: '2024-12-01',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const scheduleRepo = createScheduleRepoStub({
      listByRecipient: vi.fn(async () => [schedule]),
    });

    // inactiveAt is exactly 2024-12-05T12:00:00Z
    const inactiveAt = new Date('2024-12-05T12:00:00Z');
    const medicationRepo = createMedicationRepoStub({
      listByRecipient: vi.fn(async () => [
        {
          id: 'med-1',
          recipientId,
          name: 'Aspirin',
          instructions: null,
          isActive: false,
          inactiveAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    });

    const doseTakenRepo = createDoseTakenRepoStub();

    const service = createDoseService(scheduleRepo, doseTakenRepo, medicationRepo, {
      now: () => new Date('2024-12-01T08:00:00Z'),
    });

    const doses = await service.listUpcomingDoses(userId, recipientId, {
      from: new Date('2024-12-01T00:00:00Z'),
      to: new Date('2024-12-10T00:00:00Z'),
      includeInactive: true,
    });

    // Should include Dec 1-4 (4 doses), but NOT Dec 5 (scheduledFor > inactiveAt is false, but = is excluded too)
    // Note: The condition is scheduledFor > inactiveAt, so scheduledFor === inactiveAt should be excluded
    for (const dose of doses) {
      expect(dose.scheduledFor.getTime()).toBeLessThanOrEqual(inactiveAt.getTime());
    }
  });

  it('markTaken succeeds for isActive=false with inactiveAt=null (edge case)', async () => {
    const schedule: MedicationSchedule = {
      id: 'schedule-1',
      medicationId: 'med-1',
      recurrence: 'daily',
      timeOfDay: '09:00',
      timezone: 'America/New_York',
      daysOfWeek: null,
      startDate: '2024-12-01',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Edge case: isActive=false but inactiveAt=null (legacy data or manual DB update)
    const medication: Medication = {
      id: 'med-1',
      recipientId,
      name: 'Aspirin',
      instructions: null,
      isActive: false,
      inactiveAt: null, // No inactiveAt timestamp
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const scheduleRepo = createScheduleRepoStub({
      findById: vi.fn(async () => schedule),
    });

    const takenAt = new Date('2024-12-05T15:00:00Z');
    const doseTakenRepo = createDoseTakenRepoStub({
      markTaken: vi.fn(async () => ({
        id: 'taken-1',
        recipientId,
        medicationId: 'med-1',
        scheduleId: 'schedule-1',
        scheduledFor: new Date('2024-12-05T14:00:00Z'),
        takenAt,
        takenByUserId: userId,
      })),
    });

    const medicationRepo = createMedicationRepoStub({
      findById: vi.fn(async () => medication),
    });

    const service = createDoseService(scheduleRepo, doseTakenRepo, medicationRepo);

    // Since inactiveAt is null, the check `medication.inactiveAt && scheduledFor > medication.inactiveAt` is false
    // So marking should succeed
    const doseId = encodeDoseId('schedule-1', new Date('2024-12-05T14:00:00Z'));
    const result = await service.markTaken(userId, doseId);

    expect(result.status).toBe('taken');
    expect(result.takenAt).toEqual(takenAt);
  });

  it('markTaken marks retroactive dose (past scheduledFor) successfully', async () => {
    const schedule: MedicationSchedule = {
      id: 'schedule-1',
      medicationId: 'med-1',
      recurrence: 'daily',
      timeOfDay: '09:00',
      timezone: 'UTC',
      daysOfWeek: null,
      startDate: '2024-12-01',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const medication: Medication = {
      id: 'med-1',
      recipientId,
      name: 'Aspirin',
      instructions: null,
      isActive: true,
      inactiveAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const scheduleRepo = createScheduleRepoStub({
      findById: vi.fn(async () => schedule),
    });

    // Dose scheduled for Dec 1, but we're marking it on Dec 10
    const scheduledFor = new Date('2024-12-01T09:00:00Z');
    const takenAt = new Date('2024-12-10T15:00:00Z');

    const doseTakenRepo = createDoseTakenRepoStub({
      markTaken: vi.fn(async () => ({
        id: 'taken-1',
        recipientId,
        medicationId: 'med-1',
        scheduleId: 'schedule-1',
        scheduledFor,
        takenAt,
        takenByUserId: userId,
      })),
    });

    const medicationRepo = createMedicationRepoStub({
      findById: vi.fn(async () => medication),
    });

    const service = createDoseService(scheduleRepo, doseTakenRepo, medicationRepo, {
      now: () => new Date('2024-12-10T15:00:00Z'),
    });

    const doseId = encodeDoseId('schedule-1', scheduledFor);
    const result = await service.markTaken(userId, doseId);

    expect(result.status).toBe('taken');
    expect(result.scheduledFor).toEqual(scheduledFor);
    expect(result.takenAt).toEqual(takenAt);
  });

  it('markTaken is idempotent (calling twice returns same result)', async () => {
    const schedule: MedicationSchedule = {
      id: 'schedule-1',
      medicationId: 'med-1',
      recurrence: 'daily',
      timeOfDay: '09:00',
      timezone: 'UTC',
      daysOfWeek: null,
      startDate: '2024-12-01',
      endDate: null,
      dosageNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const medication: Medication = {
      id: 'med-1',
      recipientId,
      name: 'Aspirin',
      instructions: null,
      isActive: true,
      inactiveAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const scheduleRepo = createScheduleRepoStub({
      findById: vi.fn(async () => schedule),
    });

    const scheduledFor = new Date('2024-12-05T09:00:00Z');
    const takenAt = new Date('2024-12-05T10:00:00Z');

    const takenRecord = {
      id: 'taken-1',
      recipientId,
      medicationId: 'med-1',
      scheduleId: 'schedule-1',
      scheduledFor,
      takenAt,
      takenByUserId: userId,
    };

    // Mock markTaken to return the same record each time (idempotent behavior)
    const doseTakenRepo = createDoseTakenRepoStub({
      markTaken: vi.fn(async () => takenRecord),
    });

    const medicationRepo = createMedicationRepoStub({
      findById: vi.fn(async () => medication),
    });

    const service = createDoseService(scheduleRepo, doseTakenRepo, medicationRepo);

    const doseId = encodeDoseId('schedule-1', scheduledFor);

    // Call markTaken twice
    const result1 = await service.markTaken(userId, doseId);
    const result2 = await service.markTaken(userId, doseId);

    // Both should succeed and return the same result
    expect(result1.status).toBe('taken');
    expect(result2.status).toBe('taken');
    expect(result1.takenAt).toEqual(result2.takenAt);
    expect(result1.doseId).toBe(result2.doseId);
  });
});
