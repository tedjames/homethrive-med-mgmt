/**
 * Drizzle ORM implementation of DoseTakenRepository.
 *
 * ## Trust-Caller Authorization Pattern
 *
 * This repository implements the "trust-caller" pattern for authorization:
 *
 * - **markTaken**: Records `userId` as `takenByUserId` but does NOT verify the
 *   user owns the schedule. The service layer must call
 *   `scheduleRepository.findById(userId, scheduleId)` first to enforce access.
 *
 * - **getTakenMap**: Ignores `userId` entirely. Once the service layer has
 *   verified that the requested scheduleIds belong to authorized schedules,
 *   we return ALL taken records for those schedules. This is intentional for
 *   multi-caregiver support: if caregiver A marks a dose taken, caregiver B
 *   should also see it as taken when viewing upcoming doses.
 *
 * This design keeps authorization logic in the service layer (DoseService)
 * where business rules are enforced, while this repository remains a pure
 * data access layer.
 *
 * @see DoseTakenRepository interface in @homethrive/core for the full contract
 */
import type { DoseTaken, DoseTakenRepository, MarkDoseTakenInput, UserId } from '@homethrive/core';
import { and, eq, gte, inArray, lt } from 'drizzle-orm';

import type { DbClient } from '../connection.js';
import { doseTaken } from '../schema/core.js';

/**
 * Maps a database dose_taken row to the domain DoseTaken type.
 */
function toDomain(row: typeof doseTaken.$inferSelect): DoseTaken {
  return {
    id: row.id,
    recipientId: row.recipientId,
    medicationId: row.medicationId,
    scheduleId: row.scheduleId,
    scheduledFor: row.scheduledFor,
    takenAt: row.takenAt,
    takenByUserId: row.takenByUserId,
  };
}

/**
 * Generates a composite key string for dose lookup in the taken map.
 * Format: "{scheduleId}|{scheduledFor ISO string}"
 */
function doseKeyString(scheduleId: string, scheduledFor: Date): string {
  return `${scheduleId}|${scheduledFor.toISOString()}`;
}

export class DrizzleDoseTakenRepository implements DoseTakenRepository {
  constructor(private readonly db: DbClient) {}

  /**
   * Records that a dose was taken.
   *
   * @param userId - The user marking the dose as taken (stored as `takenByUserId`)
   * @param input - Dose identification and timing data
   * @returns The created (or existing) dose-taken record
   *
   * @remarks
   * - **Idempotent**: If the dose is already marked taken, returns the existing record
   * - **Trust-caller pattern**: Does NOT verify user owns the schedule;
   *   the service layer must validate access before calling this method
   * - Uses `ON CONFLICT DO NOTHING` + follow-up SELECT for idempotency
   */
  async markTaken(userId: UserId, input: MarkDoseTakenInput): Promise<DoseTaken> {
    const inserted = await this.db
      .insert(doseTaken)
      .values({
        recipientId: input.recipientId,
        medicationId: input.medicationId,
        scheduleId: input.scheduleId,
        scheduledFor: input.scheduledFor,
        takenAt: input.takenAt,
        takenByUserId: userId,
      })
      .onConflictDoNothing({ target: [doseTaken.scheduleId, doseTaken.scheduledFor] })
      .returning();

    if (inserted[0]) {
      return toDomain(inserted[0]);
    }

    // Idempotency: if insert was a no-op due to conflict, fetch the existing record.
    // Query matches the unique constraint (scheduleId, scheduledFor) exactly.
    // Authorization is already validated by the caller (doseService.markTaken checks schedule ownership).
    const existing = await this.db
      .select()
      .from(doseTaken)
      .where(
        and(
          eq(doseTaken.scheduleId, input.scheduleId),
          eq(doseTaken.scheduledFor, input.scheduledFor)
        )
      )
      .limit(1);

    if (!existing[0]) {
      // Should be impossible if the unique constraint exists and caused the conflict.
      throw new Error('DoseTaken idempotency lookup failed - this indicates a bug');
    }

    return toDomain(existing[0]);
  }

  /**
   * Retrieves a map of taken doses for the given schedules and time range.
   *
   * @param _userId - Ignored; authorization is handled by the service layer
   * @param scheduleIds - Schedule IDs to check (must already be authorized)
   * @param from - Start of time range (inclusive)
   * @param to - End of time range (exclusive)
   * @returns Map keyed by "{scheduleId}|{scheduledFor}" with taken metadata
   *
   * @remarks
   * - **Trust-caller pattern**: Ignores userId; the service layer must filter
   *   scheduleIds to only those the user has access to
   * - Returns ALL taken records for authorized schedules to support multi-caregiver
   *   visibility (if caregiver A marks taken, caregiver B should also see it)
   */
  async getTakenMap(
    _userId: UserId,
    scheduleIds: string[],
    from: Date,
    to: Date
  ): Promise<Map<string, { takenAt: Date; takenByUserId: string }>> {
    if (scheduleIds.length === 0) {
      return new Map();
    }

    // Authorization is handled by the caller - scheduleIds are already filtered to
    // schedules owned by the user. We return ALL taken records for these schedules
    // so that if caregiver A marks a dose taken, caregiver B also sees it as taken.
    const rows = await this.db
      .select({
        scheduleId: doseTaken.scheduleId,
        scheduledFor: doseTaken.scheduledFor,
        takenAt: doseTaken.takenAt,
        takenByUserId: doseTaken.takenByUserId,
      })
      .from(doseTaken)
      .where(
        and(
          inArray(doseTaken.scheduleId, scheduleIds),
          gte(doseTaken.scheduledFor, from),
          lt(doseTaken.scheduledFor, to)
        )
      );

    const map = new Map<string, { takenAt: Date; takenByUserId: string }>();
    for (const row of rows) {
      map.set(doseKeyString(row.scheduleId, row.scheduledFor), {
        takenAt: row.takenAt,
        takenByUserId: row.takenByUserId,
      });
    }

    return map;
  }
}

