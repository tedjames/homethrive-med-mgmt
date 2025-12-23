/**
 * Dose domain service.
 *
 * Provides business logic for managing medication doses. This service implements
 * the "computed doses" model where dose occurrences are generated on-the-fly from
 * schedules rather than being pre-materialized in the database.
 *
 * Key concepts:
 * - Doses are computed from schedule recurrence rules within a time window
 * - Only "taken" events are persisted (in the dose_taken table)
 * - Dose identity is determined by (scheduleId, scheduledFor) tuple
 * - Doses use opaque IDs that encode the schedule and timestamp
 *
 * @module doses/service
 */

import type { UserId } from '../../shared/types.js';
import type { MedicationRepository } from '../medications/repository.js';
import type { Medication } from '../medications/entity.js';
import { InactiveMedicationError, MedicationNotFoundError } from '../medications/errors.js';
import type { ScheduleRepository } from '../schedules/repository.js';
import type { MedicationSchedule } from '../schedules/entity.js';

import type { DoseTakenRepository } from './repository.js';
import type { DoseOccurrence, ListDosesFilters } from './dose-occurrence.entity.js';
import { decodeDoseId, encodeDoseId } from './dose-id.js';
import { DoseNotFoundError } from './errors.js';
import { generateOccurrences } from './recurrence.js';

/**
 * Creates a unique string key for a dose occurrence.
 * Used internally for matching doses with taken records.
 *
 * @param scheduleId - The schedule's unique identifier
 * @param scheduledFor - The scheduled time in UTC
 * @returns A string key in format "scheduleId|isoTimestamp"
 * @internal
 */
function doseKeyString(scheduleId: string, scheduledFor: Date): string {
  return `${scheduleId}|${scheduledFor.toISOString()}`;
}

/**
 * Checks if a medication is inactive.
 *
 * @param medication - The medication to check
 * @returns True if the medication is inactive
 * @internal
 */
function isMedicationInactive(medication: Medication): boolean {
  return medication.isActive === false || medication.inactiveAt !== null;
}

/**
 * Creates a dose service instance with the provided repositories.
 *
 * The dose service requires access to schedules, medications, and dose-taken
 * repositories because it needs to:
 * 1. Fetch schedules to compute dose occurrences
 * 2. Fetch medications to get names and check active status
 * 3. Fetch/create taken records to track dose completion
 *
 * @param scheduleRepo - The schedule repository implementation
 * @param doseTakenRepo - The dose-taken repository implementation
 * @param medicationRepo - The medication repository implementation
 * @param options - Optional configuration
 * @param options.now - Custom clock function for testing (defaults to `() => new Date()`)
 * @returns Service object with dose management methods
 *
 * @example
 * ```typescript
 * const service = createDoseService(
 *   scheduleRepository,
 *   doseTakenRepository,
 *   medicationRepository
 * );
 *
 * // List upcoming doses for a care recipient
 * const doses = await service.listUpcomingDoses(userId, recipientId);
 *
 * // Mark a dose as taken
 * const taken = await service.markTaken(userId, doseId);
 * ```
 */
export function createDoseService(
  scheduleRepo: ScheduleRepository,
  doseTakenRepo: DoseTakenRepository,
  medicationRepo: MedicationRepository,
  options?: { now?: () => Date }
) {
  const now = options?.now ?? (() => new Date());

  /**
   * Lists upcoming dose occurrences for a care recipient.
   *
   * Generates dose occurrences by applying schedule recurrence rules within
   * the specified time window. Each occurrence is enriched with:
   * - Medication name and IDs
   * - Taken status (merged from dose_taken table)
   * - Opaque dose ID for client use
   *
   * By default, uses a 7-day window starting from the current time.
   * Inactive medications are excluded unless `includeInactive` is true.
   *
   * The returned doses are sorted chronologically by scheduled time.
   *
   * @param userId - The requesting user's ID (for authorization)
   * @param recipientId - The care recipient's unique identifier
   * @param filters - Optional filters for the query
   * @param filters.from - Window start time (default: now)
   * @param filters.to - Window end time (default: 7 days from `from`)
   * @param filters.includeInactive - Include doses for inactive medications (default: false)
   * @returns Array of dose occurrences sorted by scheduledFor time
   *
   * @example
   * ```typescript
   * // Get doses for the next 7 days (default)
   * const doses = await service.listUpcomingDoses('user-123', 'recipient-456');
   *
   * // Get doses for a specific date range
   * const doses = await service.listUpcomingDoses('user-123', 'recipient-456', {
   *   from: new Date('2024-12-01T00:00:00Z'),
   *   to: new Date('2024-12-08T00:00:00Z'),
   * });
   *
   * // Include inactive medications
   * const allDoses = await service.listUpcomingDoses('user-123', 'recipient-456', {
   *   includeInactive: true,
   * });
   * ```
   */
  async function listUpcomingDoses(
    userId: UserId,
    recipientId: string,
    filters?: ListDosesFilters
  ): Promise<DoseOccurrence[]> {
    const windowFrom = filters?.from ?? now();
    const windowTo =
      filters?.to ?? new Date(windowFrom.getTime() + 7 * 24 * 60 * 60 * 1000);

    const includeInactive = filters?.includeInactive ?? false;

    // Fetch schedules and medications in parallel
    const [schedules, medications] = await Promise.all([
      scheduleRepo.listByRecipient(userId, recipientId),
      medicationRepo.listByRecipient(userId, recipientId, { includeInactive: true }),
    ]);

    if (schedules.length === 0) {
      return [];
    }

    const medicationById = new Map(medications.map((m) => [m.id, m] as const));

    // Fetch taken records for the window
    const scheduleIds = schedules.map((s) => s.id);
    const takenMap = await doseTakenRepo.getTakenMap(userId, scheduleIds, windowFrom, windowTo);

    const occurrences: DoseOccurrence[] = [];

    for (const schedule of schedules) {
      const medication = medicationById.get(schedule.medicationId);
      if (!medication) {
        // Orphaned schedule – ignore at the domain layer.
        continue;
      }

      // Skip inactive medications unless explicitly requested
      if (!includeInactive && isMedicationInactive(medication)) {
        continue;
      }

      // Generate occurrences using DST-safe recurrence logic
      const scheduledDates = generateOccurrences(schedule, windowFrom, windowTo);

      for (const scheduledFor of scheduledDates) {
        // Skip doses scheduled after medication was deactivated
        if (medication.inactiveAt && scheduledFor > medication.inactiveAt) {
          continue;
        }

        const doseId = encodeDoseId(schedule.id, scheduledFor);
        const taken = takenMap.get(doseKeyString(schedule.id, scheduledFor));

        occurrences.push({
          doseId,
          scheduleId: schedule.id,
          medicationId: medication.id,
          recipientId,
          medicationName: medication.name,
          scheduledFor,
          status: taken ? 'taken' : 'scheduled',
          takenAt: taken ? taken.takenAt : null,
          takenByUserId: taken ? taken.takenByUserId : null,
        });
      }
    }

    // Sort chronologically
    return occurrences.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  }

  /**
   * Marks a dose as taken.
   *
   * Records that the specified dose was taken at the current time by the
   * requesting user. This operation is idempotent - marking an already-taken
   * dose will return the existing record without error.
   *
   * Validates that:
   * - The dose ID is valid and decodable
   * - The schedule exists
   * - The medication exists and is active (or was active at scheduled time)
   *
   * @param userId - The user marking the dose as taken (recorded as takenByUserId)
   * @param doseId - The opaque dose ID (from listUpcomingDoses)
   * @returns The dose occurrence with updated taken status
   * @throws {DoseNotFoundError} If the dose ID is invalid or schedule doesn't exist
   * @throws {MedicationNotFoundError} If the medication doesn't exist
   * @throws {InactiveMedicationError} If trying to mark a dose scheduled after medication was deactivated
   *
   * @example
   * ```typescript
   * // Mark a dose as taken
   * const dose = await service.markTaken('user-123', 'v1:YWJjMTIz...');
   * console.log(dose.status); // 'taken'
   * console.log(dose.takenAt); // Current timestamp
   * console.log(dose.takenByUserId); // 'user-123'
   * ```
   */
  async function markTaken(userId: UserId, doseId: string): Promise<DoseOccurrence> {
    // Decode the opaque dose ID to get schedule and time
    const { scheduleId, scheduledFor } = decodeDoseId(doseId);

    // Verify the schedule exists
    const schedule: MedicationSchedule | null = await scheduleRepo.findById(userId, scheduleId);
    if (!schedule) {
      throw new DoseNotFoundError(doseId);
    }

    // Verify the medication exists
    const medication = await medicationRepo.findById(userId, schedule.medicationId);
    if (!medication) {
      throw new MedicationNotFoundError(schedule.medicationId);
    }

    // Prevent marking doses scheduled after medication was deactivated
    if (medication.inactiveAt && scheduledFor > medication.inactiveAt) {
      throw new InactiveMedicationError(medication.id);
    }

    // Record the taken event (idempotent via unique constraint)
    const takenRecord = await doseTakenRepo.markTaken(userId, {
      scheduleId,
      scheduledFor,
      takenAt: now(),
      takenByUserId: userId,
      recipientId: medication.recipientId,
      medicationId: medication.id,
    });

    return {
      doseId,
      scheduleId,
      medicationId: medication.id,
      recipientId: medication.recipientId,
      medicationName: medication.name,
      scheduledFor,
      status: 'taken',
      takenAt: takenRecord.takenAt,
      takenByUserId: takenRecord.takenByUserId,
    };
  }

  return { listUpcomingDoses, markTaken };
}

/**
 * Type representing the dose service instance.
 * Useful for typing service parameters in other modules.
 */
export type DoseService = ReturnType<typeof createDoseService>;
