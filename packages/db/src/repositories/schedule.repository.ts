/**
 * Drizzle ORM implementation of ScheduleRepository.
 *
 * ## Authorization Pattern
 *
 * All methods require a `userId` parameter and filter queries by `createdByUserId`
 * to ensure users can only access schedules they created. This is enforced at the
 * database query level for defense-in-depth.
 *
 * ## Relationship to Medications
 *
 * Schedules are always associated with a medication. When creating schedules via
 * `createMany()`, the method verifies that all referenced medications belong to
 * the calling user before inserting.
 *
 * @see ScheduleRepository interface in @homethrive/core for the full contract
 */
import type {
  CreateScheduleInput,
  MedicationSchedule,
  ScheduleRepository,
  UserId,
} from '@homethrive/core';
import { and, asc, eq, inArray } from 'drizzle-orm';

import type { DbClient } from '../connection.js';
import { medicationSchedules, medications } from '../schema/core.js';

/**
 * Maps a database schedule row to the domain MedicationSchedule type.
 */
function toDomain(row: typeof medicationSchedules.$inferSelect): MedicationSchedule {
  return {
    id: row.id,
    medicationId: row.medicationId,
    recurrence: row.recurrence,
    timeOfDay: row.timeOfDay,
    timezone: row.timezone ?? null,
    daysOfWeek: row.daysOfWeek ?? null,
    startDate: row.startDate,
    endDate: row.endDate ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Deduplicates an array of strings.
 */
function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

export class DrizzleScheduleRepository implements ScheduleRepository {
  constructor(private readonly db: DbClient) {}

  /**
   * Finds a schedule by ID, scoped to the authenticated user.
   *
   * @param userId - The authenticated user's ID
   * @param scheduleId - The schedule's UUID
   * @returns The schedule if found and owned by user, null otherwise
   */
  async findById(userId: UserId, scheduleId: string): Promise<MedicationSchedule | null> {
    const rows = await this.db
      .select()
      .from(medicationSchedules)
      .where(and(eq(medicationSchedules.id, scheduleId), eq(medicationSchedules.createdByUserId, userId)))
      .limit(1);

    return rows[0] ? toDomain(rows[0]) : null;
  }

  /**
   * Lists all schedules for a specific medication.
   *
   * @param userId - The authenticated user's ID
   * @param medicationId - The medication's UUID
   * @returns Array of schedules, ordered by creation date ascending
   */
  async listByMedication(userId: UserId, medicationId: string): Promise<MedicationSchedule[]> {
    const rows = await this.db
      .select()
      .from(medicationSchedules)
      .where(and(eq(medicationSchedules.medicationId, medicationId), eq(medicationSchedules.createdByUserId, userId)))
      .orderBy(asc(medicationSchedules.createdAt));

    return rows.map(toDomain);
  }

  /**
   * Lists all schedules for a care recipient (across all their medications).
   *
   * @param userId - The authenticated user's ID
   * @param recipientId - The care recipient's UUID
   * @returns Array of schedules, ordered by creation date ascending
   *
   * @remarks
   * Joins through the medications table to find schedules for all medications
   * belonging to the specified care recipient.
   */
  async listByRecipient(userId: UserId, recipientId: string): Promise<MedicationSchedule[]> {
    const rows = await this.db
      .select({ schedule: medicationSchedules })
      .from(medicationSchedules)
      .innerJoin(medications, eq(medicationSchedules.medicationId, medications.id))
      .where(and(eq(medications.recipientId, recipientId), eq(medicationSchedules.createdByUserId, userId)))
      .orderBy(asc(medicationSchedules.createdAt));

    return rows.map((r) => toDomain(r.schedule));
  }

  /**
   * Creates multiple schedules in a single batch operation.
   *
   * @param userId - The authenticated user's ID
   * @param schedules - Array of schedule definitions with their associated medication IDs
   * @returns Array of created schedules
   * @throws {Error} If any referenced medication doesn't exist or isn't owned by the user
   *
   * @remarks
   * - Validates ownership of all referenced medications before inserting
   * - Returns empty array if `schedules` is empty (no-op)
   * - All schedules are inserted in a single database round-trip for efficiency
   */
  async createMany(userId: UserId, schedules: CreateScheduleInput[]): Promise<MedicationSchedule[]> {
    if (schedules.length === 0) {
      return [];
    }

    const medicationIds = uniqueStrings(schedules.map((s) => s.medicationId));
    const medicationRows = await this.db
      .select({ id: medications.id, createdByUserId: medications.createdByUserId })
      .from(medications)
      .where(and(inArray(medications.id, medicationIds), eq(medications.createdByUserId, userId)));

    const userIdByMedicationId = new Map(medicationRows.map((m) => [m.id, m.createdByUserId]));

    for (const medicationId of medicationIds) {
      if (!userIdByMedicationId.has(medicationId)) {
        throw new Error(`Medication ${medicationId} not found or unauthorized`);
      }
    }

    const rows = await this.db
      .insert(medicationSchedules)
      .values(
        schedules.map((s) => ({
          createdByUserId: userId,
          medicationId: s.medicationId,
          recurrence: s.recurrence,
          timeOfDay: s.timeOfDay,
          timezone: s.timezone ?? null,
          daysOfWeek: s.daysOfWeek ?? null,
          startDate: s.startDate,
          endDate: s.endDate ?? null,
        }))
      )
      .returning();

    return rows.map(toDomain);
  }
}

