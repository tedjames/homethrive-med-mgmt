/**
 * Dose taken repository interface (port).
 *
 * ## Authorization Model: Trust-Caller Pattern
 *
 * This repository uses the "trust-caller" authorization pattern. Methods accept
 * a `userId` parameter but DO NOT enforce authorization themselves. Instead:
 *
 * 1. **Caller is responsible** for validating that the user has access to the
 *    entities being operated on (schedules, medications, recipients).
 *
 * 2. **Service layer validates** ownership before calling repository methods.
 *    For example, `doseService.markTaken` verifies the schedule belongs to the
 *    user via `scheduleRepository.findById(userId, scheduleId)` before calling
 *    `doseTakenRepository.markTaken`.
 *
 * 3. **getTakenMap intentionally ignores userId** - once the caller has verified
 *    that the scheduleIds belong to authorized schedules, we return ALL taken
 *    records regardless of who marked them. This enables multi-caregiver scenarios
 *    where caregiver A marks a dose taken and caregiver B sees it as taken.
 *
 * This pattern keeps authorization logic in the service layer where business
 * rules live, while keeping repositories focused on data access.
 */

import type { UserId } from '../../shared/types.js';
import type { DoseTaken, MarkDoseTakenInput } from './dose-taken.entity.js';

export interface DoseTakenRepository {
  /**
   * Mark a dose as taken.
   *
   * Idempotent: if already marked taken, returns existing record.
   *
   * @param userId - The user marking the dose (recorded as takenByUserId).
   *                 Caller must verify user has access to the schedule/medication.
   * @param input - Dose identification and timing data.
   * @returns The created or existing DoseTaken record.
   */
  markTaken(userId: UserId, input: MarkDoseTakenInput): Promise<DoseTaken>;

  /**
   * Unmark a dose as taken (delete the taken record).
   *
   * Idempotent: if not marked taken, returns false (no error).
   *
   * @param userId - Passed for consistency; NOT used for authorization.
   *                 Caller must verify user has access to the schedule.
   * @param scheduleId - The schedule ID for the dose.
   * @param scheduledFor - The scheduled time of the dose.
   * @returns True if a record was deleted, false if no record existed.
   */
  unmarkTaken(userId: UserId, scheduleId: string, scheduledFor: Date): Promise<boolean>;

  /**
   * Get all taken records for given schedules within a time window.
   *
   * Returns a Map keyed by "scheduleId|scheduledForISO" for fast lookup.
   *
   * @param userId - Passed for consistency; NOT used for filtering.
   *                 Caller must ensure scheduleIds are already authorized.
   * @param scheduleIds - Schedule IDs to query (must be pre-authorized by caller).
   * @param from - Inclusive start of window.
   * @param to - Exclusive end of window.
   * @returns Map from dose key to taken info.
   */
  getTakenMap(
    userId: UserId,
    scheduleIds: string[],
    from: Date,
    to: Date
  ): Promise<Map<string, { takenAt: Date; takenByUserId: string }>>;
}
