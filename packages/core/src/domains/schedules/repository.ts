/**
 * Schedule repository interface (port).
 */

import type { UserId } from '../../shared/types.js';
import type { CreateScheduleInput, MedicationSchedule } from './entity.js';

export interface ScheduleRepository {
  findById(userId: UserId, scheduleId: string): Promise<MedicationSchedule | null>;
  listByMedication(userId: UserId, medicationId: string): Promise<MedicationSchedule[]>;
  listByRecipient(userId: UserId, recipientId: string): Promise<MedicationSchedule[]>;
  createMany(userId: UserId, schedules: CreateScheduleInput[]): Promise<MedicationSchedule[]>;
}
