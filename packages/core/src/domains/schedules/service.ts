/**
 * Schedule domain service.
 *
 * Provides business logic for managing medication schedules. Schedules define
 * when medications should be taken using recurrence rules (daily or weekly).
 *
 * Key concepts:
 * - Schedules are always associated with a medication
 * - Times are stored in local time with an explicit timezone
 * - Weekly schedules use ISO weekday numbers (1=Monday through 7=Sunday)
 * - Schedules have a start date and optional end date
 *
 * @module schedules/service
 */

import type { UserId } from '../../shared/types.js';
import type { CreateScheduleInput, MedicationSchedule } from './entity.js';
import { ScheduleNotFoundError } from './errors.js';
import type { ScheduleRepository } from './repository.js';

/**
 * Creates a schedule service instance with the provided repository.
 *
 * Uses functional factory pattern for dependency injection, enabling easy testing
 * with mock repositories.
 *
 * Note: Schedules are typically created alongside medications via the medication
 * service's `create` method, which ensures the "medication must have at least one
 * schedule" invariant. This service is used for additional schedule management.
 *
 * @param repo - The schedule repository implementation
 * @returns Service object with schedule management methods
 *
 * @example
 * ```typescript
 * const repo = new DrizzleScheduleRepository(db);
 * const service = createScheduleService(repo);
 *
 * const schedules = await service.listByMedication(userId, medicationId);
 * ```
 */
export function createScheduleService(repo: ScheduleRepository) {
  /**
   * Creates multiple schedules at once.
   *
   * This is useful for adding additional schedules to an existing medication,
   * or for batch operations. For creating a medication with its initial schedules,
   * use the medication service's `create` method instead.
   *
   * @param userId - The requesting user's ID (for authorization)
   * @param schedules - Array of schedule definitions to create
   * @returns Array of newly created schedules
   *
   * @example
   * ```typescript
   * const newSchedules = await service.createMany('user-123', [
   *   {
   *     medicationId: 'med-456',
   *     recurrence: 'daily',
   *     timeOfDay: '09:00',
   *     startDate: '2024-01-01',
   *   },
   *   {
   *     medicationId: 'med-456',
   *     recurrence: 'daily',
   *     timeOfDay: '21:00',
   *     startDate: '2024-01-01',
   *   },
   * ]);
   * ```
   */
  async function createMany(userId: UserId, schedules: CreateScheduleInput[]): Promise<MedicationSchedule[]> {
    return repo.createMany(userId, schedules);
  }

  /**
   * Retrieves a schedule by ID.
   *
   * @param userId - The requesting user's ID (for authorization)
   * @param scheduleId - The schedule's unique identifier
   * @returns The schedule if found
   * @throws {ScheduleNotFoundError} If the schedule doesn't exist or user lacks access
   *
   * @example
   * ```typescript
   * const schedule = await service.getById('user-123', 'schedule-456');
   * console.log(schedule.timeOfDay); // "09:00"
   * console.log(schedule.recurrence); // "daily"
   * ```
   */
  async function getById(userId: UserId, scheduleId: string): Promise<MedicationSchedule> {
    const schedule = await repo.findById(userId, scheduleId);
    if (!schedule) {
      throw new ScheduleNotFoundError(scheduleId);
    }
    return schedule;
  }

  /**
   * Lists all schedules for a medication.
   *
   * Returns all schedules associated with the given medication, regardless of
   * their start/end dates. Use this to see the complete schedule configuration
   * for a medication.
   *
   * @param userId - The requesting user's ID (for authorization)
   * @param medicationId - The medication's unique identifier
   * @returns Array of schedules (may be empty if medication has no schedules)
   *
   * @example
   * ```typescript
   * const schedules = await service.listByMedication('user-123', 'med-456');
   * for (const schedule of schedules) {
   *   console.log(`${schedule.recurrence} at ${schedule.timeOfDay}`);
   * }
   * ```
   */
  async function listByMedication(userId: UserId, medicationId: string): Promise<MedicationSchedule[]> {
    return repo.listByMedication(userId, medicationId);
  }

  /**
   * Lists all schedules for a care recipient.
   *
   * Returns schedules across all medications for the given care recipient.
   * This is primarily used internally by the dose service to generate
   * upcoming dose occurrences.
   *
   * @param userId - The requesting user's ID (for authorization)
   * @param recipientId - The care recipient's unique identifier
   * @returns Array of schedules across all of the recipient's medications
   *
   * @example
   * ```typescript
   * const allSchedules = await service.listByRecipient('user-123', 'recipient-456');
   * // Returns schedules for all medications belonging to this recipient
   * ```
   */
  async function listByRecipient(userId: UserId, recipientId: string): Promise<MedicationSchedule[]> {
    return repo.listByRecipient(userId, recipientId);
  }

  return { createMany, getById, listByMedication, listByRecipient };
}

/**
 * Type representing the schedule service instance.
 * Useful for typing service parameters in other modules.
 */
export type ScheduleService = ReturnType<typeof createScheduleService>;
