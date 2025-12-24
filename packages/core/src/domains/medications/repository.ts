/**
 * Medication repository interface (port).
 */

import type { UserId } from '../../shared/types.js';
import type { CreateMedicationInput, Medication, UpdateMedicationInput } from './entity.js';
import type { CreateScheduleForMedicationInput, MedicationSchedule } from '../schedules/entity.js';

export interface MedicationRepository {
  findById(userId: UserId, medicationId: string): Promise<Medication | null>;
  listByRecipient(
    userId: UserId,
    recipientId: string,
    options?: { includeInactive?: boolean }
  ): Promise<Medication[]>;
  create(userId: UserId, recipientId: string, input: CreateMedicationInput): Promise<Medication>;
  update(userId: UserId, medicationId: string, input: UpdateMedicationInput): Promise<Medication | null>;
  setInactive(userId: UserId, medicationId: string, inactiveAt: Date): Promise<Medication | null>;
  setActive(userId: UserId, medicationId: string): Promise<Medication | null>;

  /**
   * Atomically create a medication with its schedules.
   * Ensures the invariant: "each medication must have at least one schedule".
   */
  createWithSchedules(
    userId: UserId,
    recipientId: string,
    medicationInput: CreateMedicationInput,
    schedulesInput: CreateScheduleForMedicationInput[]
  ): Promise<{ medication: Medication; schedules: MedicationSchedule[] }>;
}
