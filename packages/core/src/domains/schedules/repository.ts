/**
 * Schedule repository interface (port).
 */

import type { UserId } from '../../shared/types.js';
import type { CreateScheduleInput, MedicationSchedule, UpdateScheduleInput } from './entity.js';

export interface ScheduleRepository {
  findById(userId: UserId, scheduleId: string): Promise<MedicationSchedule | null>;
  listByMedication(userId: UserId, medicationId: string): Promise<MedicationSchedule[]>;
  listByRecipient(userId: UserId, recipientId: string): Promise<MedicationSchedule[]>;
  createMany(userId: UserId, schedules: CreateScheduleInput[]): Promise<MedicationSchedule[]>;

  /**
   * Updates a schedule's properties.
   * Only provided fields will be updated.
   *
   * @returns The updated schedule, or null if not found or user lacks access
   */
  update(userId: UserId, scheduleId: string, input: UpdateScheduleInput): Promise<MedicationSchedule | null>;

  /**
   * Counts active schedules (without endDate or endDate in future) for a medication.
   * Used to enforce the "medication must have at least one active schedule" invariant.
   */
  countActiveByMedication(userId: UserId, medicationId: string): Promise<number>;
}
