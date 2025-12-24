/**
 * Medication domain service.
 *
 * Provides business logic for managing medications for care recipients.
 * Enforces key business invariants:
 * - Medications must have at least one schedule at creation time
 * - Medications cannot be deleted (soft delete only via deactivation)
 * - Inactive medications cannot be modified (must be reactivated first)
 *
 * @module medications/service
 */

import type { UserId } from '../../shared/types.js';
import type { CreateMedicationInput, Medication, UpdateMedicationInput } from './entity.js';
import type { CreateScheduleForMedicationInput } from '../schedules/entity.js';
import {
  InactiveMedicationError,
  MedicationNotFoundError,
  MedicationRequiresScheduleError,
} from './errors.js';
import type { MedicationRepository } from './repository.js';

/**
 * Creates a medication service instance with the provided repository.
 *
 * Uses functional factory pattern for dependency injection, enabling easy testing
 * with mock repositories.
 *
 * @param repo - The medication repository implementation
 * @returns Service object with medication management methods
 *
 * @example
 * ```typescript
 * const repo = new DrizzleMedicationRepository(db);
 * const service = createMedicationService(repo);
 *
 * const medication = await service.create(userId, recipientId,
 *   { name: 'Aspirin', instructions: 'Take with food' },
 *   [{ recurrence: 'daily', timeOfDay: '09:00', startDate: '2024-01-01' }]
 * );
 * ```
 */
export function createMedicationService(repo: MedicationRepository) {
  /**
   * Creates a new medication with its schedules atomically.
   *
   * Enforces the business invariant that every medication must have at least
   * one schedule. The creation is atomic - either both medication and schedules
   * are created, or neither is.
   *
   * @param userId - The requesting user's ID (for authorization)
   * @param recipientId - The care recipient's ID who will take this medication
   * @param medicationInput - Medication details (name, optional instructions)
   * @param schedules - Array of schedule definitions (must have at least one)
   * @returns The newly created medication
   * @throws {MedicationRequiresScheduleError} If no schedules are provided
   *
   * @example
   * ```typescript
   * const medication = await service.create(
   *   'user-123',
   *   'recipient-456',
   *   { name: 'Lisinopril', instructions: 'Take in the morning' },
   *   [
   *     { recurrence: 'daily', timeOfDay: '08:00', startDate: '2024-01-01' },
   *   ]
   * );
   * ```
   */
  async function create(
    userId: UserId,
    recipientId: string,
    medicationInput: CreateMedicationInput,
    schedules: CreateScheduleForMedicationInput[]
  ): Promise<Medication> {
    if (!schedules || schedules.length === 0) {
      throw new MedicationRequiresScheduleError();
    }

    // Use atomic createWithSchedules to ensure invariant
    const result = await repo.createWithSchedules(userId, recipientId, medicationInput, schedules);
    return result.medication;
  }

  /**
   * Retrieves a medication by ID.
   *
   * @param userId - The requesting user's ID (for authorization)
   * @param medicationId - The medication's unique identifier
   * @returns The medication if found
   * @throws {MedicationNotFoundError} If the medication doesn't exist or user lacks access
   *
   * @example
   * ```typescript
   * const medication = await service.getById('user-123', 'med-456');
   * console.log(medication.name); // "Aspirin"
   * ```
   */
  async function getById(userId: UserId, medicationId: string): Promise<Medication> {
    const medication = await repo.findById(userId, medicationId);
    if (!medication) {
      throw new MedicationNotFoundError(medicationId);
    }
    return medication;
  }

  /**
   * Lists medications for a care recipient.
   *
   * By default, only active medications are returned. Pass `includeInactive: true`
   * to include medications that have been marked inactive.
   *
   * @param userId - The requesting user's ID (for authorization)
   * @param recipientId - The care recipient's ID
   * @param includeInactive - Whether to include inactive medications (default: false)
   * @returns Array of medications (may be empty)
   *
   * @example
   * ```typescript
   * // Get only active medications
   * const active = await service.listByRecipient('user-123', 'recipient-456');
   *
   * // Include inactive medications
   * const all = await service.listByRecipient('user-123', 'recipient-456', true);
   * ```
   */
  async function listByRecipient(
    userId: UserId,
    recipientId: string,
    includeInactive = false
  ): Promise<Medication[]> {
    return repo.listByRecipient(userId, recipientId, { includeInactive });
  }

  /**
   * Updates an existing medication.
   *
   * Only active medications can be updated. Attempting to update an inactive
   * medication will throw an error.
   *
   * @param userId - The requesting user's ID (for authorization)
   * @param medicationId - The medication's unique identifier
   * @param input - Fields to update (name, instructions)
   * @returns The updated medication
   * @throws {MedicationNotFoundError} If the medication doesn't exist or user lacks access
   * @throws {InactiveMedicationError} If the medication is inactive
   *
   * @example
   * ```typescript
   * const updated = await service.update('user-123', 'med-456', {
   *   instructions: 'Take with food and water',
   * });
   * ```
   */
  async function update(userId: UserId, medicationId: string, input: UpdateMedicationInput): Promise<Medication> {
    // First check if medication exists and is active
    const existing = await repo.findById(userId, medicationId);
    if (!existing) {
      throw new MedicationNotFoundError(medicationId);
    }
    if (!existing.isActive || existing.inactiveAt !== null) {
      throw new InactiveMedicationError(medicationId);
    }

    const medication = await repo.update(userId, medicationId, input);
    if (!medication) {
      // Should not happen if findById succeeded, but handle defensively
      throw new MedicationNotFoundError(medicationId);
    }
    return medication;
  }

  /**
   * Marks a medication as inactive (soft delete).
   *
   * Deactivation preserves historical dose records and allows for potential
   * reactivation. The `inactiveAt` timestamp is set to the current time.
   *
   * After being marked inactive:
   * - The medication won't appear in default listing queries
   * - No new doses will be generated for its schedules
   * - The medication cannot be updated (throws InactiveMedicationError)
   * - Historical dose-taken records remain intact
   *
   * @param userId - The requesting user's ID (for authorization)
   * @param medicationId - The medication's unique identifier
   * @returns The updated medication with isActive=false
   * @throws {MedicationNotFoundError} If the medication doesn't exist or user lacks access
   *
   * @example
   * ```typescript
   * const inactive = await service.setInactive('user-123', 'med-456');
   * console.log(inactive.isActive); // false
   * console.log(inactive.inactiveAt); // Date when it was deactivated
   * ```
   */
  async function setInactive(userId: UserId, medicationId: string): Promise<Medication> {
    const medication = await repo.setInactive(userId, medicationId, new Date());
    if (!medication) {
      throw new MedicationNotFoundError(medicationId);
    }
    return medication;
  }

  /**
   * Reactivates an inactive medication.
   *
   * Restores a previously deactivated medication to active status. After reactivation:
   * - The medication will appear in default listing queries
   * - Doses will be generated for its schedules again
   * - The medication can be updated
   *
   * @param userId - The requesting user's ID (for authorization)
   * @param medicationId - The medication's unique identifier
   * @returns The updated medication with isActive=true
   * @throws {MedicationNotFoundError} If the medication doesn't exist or user lacks access
   */
  async function reactivate(userId: UserId, medicationId: string): Promise<Medication> {
    const medication = await repo.setActive(userId, medicationId);
    if (!medication) {
      throw new MedicationNotFoundError(medicationId);
    }
    return medication;
  }

  return { create, getById, listByRecipient, update, setInactive, reactivate };
}

/**
 * Type representing the medication service instance.
 * Useful for typing service parameters in other modules.
 */
export type MedicationService = ReturnType<typeof createMedicationService>;
