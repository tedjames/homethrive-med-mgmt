/**
 * In-memory mock repositories for fast unit tests.
 */

import type { UserId } from '../shared/types.js';
import type {
  CareRecipient,
  CreateCareRecipientInput,
  UpdateCareRecipientInput,
} from '../domains/care-recipients/entity.js';
import type { CareRecipientRepository } from '../domains/care-recipients/repository.js';

import type {
  CreateMedicationInput,
  Medication,
  UpdateMedicationInput,
} from '../domains/medications/entity.js';
import type { MedicationRepository } from '../domains/medications/repository.js';

import type { CreateScheduleInput, MedicationSchedule } from '../domains/schedules/entity.js';
import type { ScheduleRepository } from '../domains/schedules/repository.js';

import type { DoseTakenRepository } from '../domains/doses/repository.js';
import type { DoseTaken, MarkDoseTakenInput } from '../domains/doses/dose-taken.entity.js';

function createIdFactory(prefix: string) {
  let i = 0;
  return () => {
    i += 1;
    return `${prefix}_${i}`;
  };
}

function doseKey(scheduleId: string, scheduledFor: Date): string {
  return `${scheduleId}|${scheduledFor.toISOString()}`;
}

type Store = {
  careRecipients: Map<string, CareRecipient>;
  medications: Map<string, Medication>;
  schedules: Map<string, MedicationSchedule>;
  doseTakenByKey: Map<string, DoseTaken>;
};

export function createMockRepositories() {
  const store: Store = {
    careRecipients: new Map(),
    medications: new Map(),
    schedules: new Map(),
    doseTakenByKey: new Map(),
  };

  const nextRecipientId = createIdFactory('recipient');
  const nextMedicationId = createIdFactory('medication');
  const nextScheduleId = createIdFactory('schedule');
  const nextDoseTakenId = createIdFactory('dose_taken');

  const careRecipientRepo: CareRecipientRepository = {
    async findById(userId: UserId, recipientId: string) {
      const recipient = store.careRecipients.get(recipientId);
      if (!recipient || recipient.createdByUserId !== userId) {
        return null;
      }
      return recipient;
    },

    async listForCaregiver(userId: UserId) {
      return Array.from(store.careRecipients.values()).filter(
        (r) => r.createdByUserId === userId
      );
    },

    async create(userId: UserId, input: CreateCareRecipientInput) {
      const now = new Date();
      const recipient: CareRecipient = {
        id: nextRecipientId(),
        createdByUserId: userId,
        displayName: input.displayName,
        timezone: input.timezone ?? 'America/New_York',
        createdAt: now,
        updatedAt: now,
      };
      store.careRecipients.set(recipient.id, recipient);
      return recipient;
    },

    async update(userId: UserId, recipientId: string, input: UpdateCareRecipientInput) {
      const existing = store.careRecipients.get(recipientId);
      if (!existing || existing.createdByUserId !== userId) return null;

      const updated: CareRecipient = {
        ...existing,
        displayName: input.displayName ?? existing.displayName,
        timezone: input.timezone ?? existing.timezone,
        updatedAt: new Date(),
      };
      store.careRecipients.set(updated.id, updated);
      return updated;
    },
  };

  const medicationRepo: MedicationRepository = {
    async findById(userId: UserId, medicationId: string) {
      const medication = store.medications.get(medicationId);
      const recipient = medication ? store.careRecipients.get(medication.recipientId) : null;
      if (!medication || !recipient || recipient.createdByUserId !== userId) {
        return null;
      }
      return medication;
    },

    async listByRecipient(userId: UserId, recipientId: string, options) {
      const recipient = store.careRecipients.get(recipientId);
      if (!recipient || recipient.createdByUserId !== userId) {
        return [];
      }

      const includeInactive = options?.includeInactive ?? false;
      return Array.from(store.medications.values())
        .filter((m) => m.recipientId === recipientId)
        .filter((m) => includeInactive || m.isActive);
    },

    async create(userId: UserId, recipientId: string, input: CreateMedicationInput) {
      const now = new Date();
      const medication: Medication = {
        id: nextMedicationId(),
        recipientId,
        name: input.name,
        instructions: input.instructions ?? null,
        isActive: true,
        inactiveAt: null,
        createdAt: now,
        updatedAt: now,
      };
      store.medications.set(medication.id, medication);
      return medication;
    },

    async update(userId: UserId, medicationId: string, input: UpdateMedicationInput) {
      const existing = store.medications.get(medicationId);
      const recipient = existing ? store.careRecipients.get(existing.recipientId) : null;
      if (!existing || !recipient || recipient.createdByUserId !== userId) return null;

      const updated: Medication = {
        ...existing,
        name: input.name ?? existing.name,
        instructions: input.instructions ?? existing.instructions,
        updatedAt: new Date(),
      };
      store.medications.set(updated.id, updated);
      return updated;
    },

    async setInactive(userId: UserId, medicationId: string, inactiveAt: Date) {
      const existing = store.medications.get(medicationId);
      const recipient = existing ? store.careRecipients.get(existing.recipientId) : null;
      if (!existing || !recipient || recipient.createdByUserId !== userId) return null;

      const updated: Medication = {
        ...existing,
        isActive: false,
        inactiveAt,
        updatedAt: new Date(),
      };
      store.medications.set(updated.id, updated);
      return updated;
    },

    async createWithSchedules(
      userId: UserId,
      recipientId: string,
      medicationInput: CreateMedicationInput,
      schedulesInput: Array<Omit<CreateScheduleInput, 'medicationId'>>
    ) {
      const medication = await medicationRepo.create(userId, recipientId, medicationInput);
      
      const schedules: MedicationSchedule[] = [];
      for (const s of schedulesInput) {
        const now = new Date();
        const schedule: MedicationSchedule = {
          id: nextScheduleId(),
          medicationId: medication.id,
          recurrence: s.recurrence,
          timeOfDay: s.timeOfDay,
          timezone: s.timezone ?? null,
          daysOfWeek: s.daysOfWeek ?? null,
          startDate: s.startDate,
          endDate: s.endDate ?? null,
          createdAt: now,
          updatedAt: now,
        };
        store.schedules.set(schedule.id, schedule);
        schedules.push(schedule);
      }

      return { medication, schedules };
    },
  };

  const scheduleRepo: ScheduleRepository = {
    async findById(userId: UserId, scheduleId: string) {
      const schedule = store.schedules.get(scheduleId);
      if (!schedule) return null;

      const medication = store.medications.get(schedule.medicationId);
      const recipient = medication ? store.careRecipients.get(medication.recipientId) : null;
      if (!medication || !recipient || recipient.createdByUserId !== userId) {
        return null;
      }

      return schedule;
    },

    async listByMedication(userId: UserId, medicationId: string) {
      const medication = store.medications.get(medicationId);
      const recipient = medication ? store.careRecipients.get(medication.recipientId) : null;
      if (!medication || !recipient || recipient.createdByUserId !== userId) {
        return [];
      }

      return Array.from(store.schedules.values()).filter((s) => s.medicationId === medicationId);
    },

    async listByRecipient(userId: UserId, recipientId: string) {
      const recipient = store.careRecipients.get(recipientId);
      if (!recipient || recipient.createdByUserId !== userId) {
        return [];
      }

      return Array.from(store.schedules.values()).filter((s) => {
        const medication = store.medications.get(s.medicationId);
        return medication?.recipientId === recipientId;
      });
    },

    async createMany(userId: UserId, inputs: CreateScheduleInput[]) {
      const now = new Date();
      const created: MedicationSchedule[] = inputs.map((input) => ({
        id: nextScheduleId(),
        medicationId: input.medicationId,
        recurrence: input.recurrence,
        timeOfDay: input.timeOfDay,
        timezone: input.timezone ?? null,
        daysOfWeek: input.daysOfWeek ?? null,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        createdAt: now,
        updatedAt: now,
      }));

      for (const schedule of created) {
        store.schedules.set(schedule.id, schedule);
      }

      return created;
    },
  };

  const doseTakenRepo: DoseTakenRepository = {
    async markTaken(userId: UserId, input: MarkDoseTakenInput) {
      const key = doseKey(input.scheduleId, input.scheduledFor);
      const existing = store.doseTakenByKey.get(key);
      if (existing) {
        return existing;
      }

      const record: DoseTaken = {
        id: nextDoseTakenId(),
        recipientId: input.recipientId,
        medicationId: input.medicationId,
        scheduleId: input.scheduleId,
        scheduledFor: input.scheduledFor,
        takenAt: input.takenAt,
        takenByUserId: userId,
      };

      store.doseTakenByKey.set(key, record);
      return record;
    },

    async getTakenMap(userId: UserId, scheduleIds: string[], from: Date, to: Date) {
      if (scheduleIds.length === 0) return new Map();

      const scheduleIdSet = new Set(scheduleIds);
      const map = new Map<string, { takenAt: Date; takenByUserId: string }>();

      for (const record of store.doseTakenByKey.values()) {
        if (record.takenByUserId !== userId) continue;
        if (!scheduleIdSet.has(record.scheduleId)) continue;
        if (record.scheduledFor < from) continue;
        if (record.scheduledFor >= to) continue;

        map.set(doseKey(record.scheduleId, record.scheduledFor), {
          takenAt: record.takenAt,
          takenByUserId: record.takenByUserId,
        });
      }

      return map;
    },
  };

  function reset() {
    store.careRecipients.clear();
    store.medications.clear();
    store.schedules.clear();
    store.doseTakenByKey.clear();
  }

  return {
    store,
    reset,
    careRecipientRepo,
    medicationRepo,
    scheduleRepo,
    doseTakenRepo,
  };
}
