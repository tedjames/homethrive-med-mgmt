/**
 * Drizzle ORM implementation of ScheduleRepository.
 *
 * ## Authorization Pattern
 *
 * All methods require a `userId` parameter and check access based on:
 * 1. User owns the recipient profile (careRecipients.userId = user)
 * 2. User created the recipient (careRecipients.createdByUserId = user) - deprecated
 * 3. User has approved caregiver access via caregiver_access table
 *
 * ## Relationship to Medications
 *
 * Schedules are always associated with a medication. When creating schedules via
 * `createMany()`, the method verifies that all referenced medications are accessible
 * to the calling user before inserting.
 *
 * @see ScheduleRepository interface in @homethrive/core for the full contract
 */
import type {
  CreateScheduleInput,
  MedicationSchedule,
  ScheduleRepository,
  UpdateScheduleInput,
  UserId,
} from '@homethrive/core';
import { and, asc, eq, gt, inArray, isNull, or, sql } from 'drizzle-orm';

import type { DbClient } from '../connection.js';
import { caregiverAccess, careRecipients, medicationSchedules, medications } from '../schema/core.js';

/**
 * Builds a SQL condition to check if a user has access to a care recipient.
 *
 * User has access if:
 * 1. They own the recipient profile (careRecipients.userId = user)
 * 2. They created the recipient (careRecipients.createdByUserId = user) - deprecated
 * 3. They have approved caregiver access
 */
function buildRecipientAccessCheck(userId: UserId) {
  const hasApprovedAccess = sql`EXISTS (
    SELECT 1 FROM ${caregiverAccess}
    WHERE ${caregiverAccess.caregiverUserId} = ${userId}
      AND ${caregiverAccess.recipientUserId} = ${careRecipients.userId}
      AND ${caregiverAccess.status} = 'approved'
  )`;

  return or(
    eq(careRecipients.userId, userId), // User owns the recipient
    eq(careRecipients.createdByUserId, userId), // User created it (deprecated)
    hasApprovedAccess // User has caregiver access
  );
}

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
    dosageNotes: row.dosageNotes ?? null,
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
   * Finds a schedule by ID, scoped to the authenticated user's access.
   *
   * @param userId - The authenticated user's ID
   * @param scheduleId - The schedule's UUID
   * @returns The schedule if found and user has access, null otherwise
   */
  async findById(userId: UserId, scheduleId: string): Promise<MedicationSchedule | null> {
    const rows = await this.db
      .select({ schedule: medicationSchedules })
      .from(medicationSchedules)
      .innerJoin(medications, eq(medicationSchedules.medicationId, medications.id))
      .innerJoin(careRecipients, eq(medications.recipientId, careRecipients.id))
      .where(and(eq(medicationSchedules.id, scheduleId), buildRecipientAccessCheck(userId)))
      .limit(1);

    return rows[0] ? toDomain(rows[0].schedule) : null;
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
      .select({ schedule: medicationSchedules })
      .from(medicationSchedules)
      .innerJoin(medications, eq(medicationSchedules.medicationId, medications.id))
      .innerJoin(careRecipients, eq(medications.recipientId, careRecipients.id))
      .where(and(eq(medicationSchedules.medicationId, medicationId), buildRecipientAccessCheck(userId)))
      .orderBy(asc(medicationSchedules.createdAt));

    return rows.map((r) => toDomain(r.schedule));
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
      .innerJoin(careRecipients, eq(medications.recipientId, careRecipients.id))
      .where(and(eq(medications.recipientId, recipientId), buildRecipientAccessCheck(userId)))
      .orderBy(asc(medicationSchedules.createdAt));

    return rows.map((r) => toDomain(r.schedule));
  }

  /**
   * Creates multiple schedules in a single batch operation.
   *
   * @param userId - The authenticated user's ID
   * @param schedules - Array of schedule definitions with their associated medication IDs
   * @returns Array of created schedules
   * @throws {Error} If any referenced medication doesn't exist or user lacks access
   *
   * @remarks
   * - Validates access to all referenced medications before inserting
   * - Returns empty array if `schedules` is empty (no-op)
   * - All schedules are inserted in a single database round-trip for efficiency
   */
  async createMany(userId: UserId, schedules: CreateScheduleInput[]): Promise<MedicationSchedule[]> {
    if (schedules.length === 0) {
      return [];
    }

    const medicationIds = uniqueStrings(schedules.map((s) => s.medicationId));

    // Check that user has access to all medications via recipient access
    const accessibleMedications = await this.db
      .select({ id: medications.id })
      .from(medications)
      .innerJoin(careRecipients, eq(medications.recipientId, careRecipients.id))
      .where(and(inArray(medications.id, medicationIds), buildRecipientAccessCheck(userId)));

    const accessibleMedicationIds = new Set(accessibleMedications.map((m) => m.id));

    for (const medicationId of medicationIds) {
      if (!accessibleMedicationIds.has(medicationId)) {
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
          dosageNotes: s.dosageNotes ?? null,
        }))
      )
      .returning();

    return rows.map(toDomain);
  }

  /**
   * Updates a schedule's properties.
   *
   * @param userId - The authenticated user's ID
   * @param scheduleId - The schedule's UUID
   * @param input - The fields to update (only provided fields are modified)
   * @returns The updated schedule if found and user has access, null otherwise
   */
  async update(
    userId: UserId,
    scheduleId: string,
    input: UpdateScheduleInput
  ): Promise<MedicationSchedule | null> {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.recurrence !== undefined) updateData.recurrence = input.recurrence;
    if (input.timeOfDay !== undefined) updateData.timeOfDay = input.timeOfDay;
    if (input.timezone !== undefined) updateData.timezone = input.timezone;
    if (input.daysOfWeek !== undefined) updateData.daysOfWeek = input.daysOfWeek;
    if (input.startDate !== undefined) updateData.startDate = input.startDate;
    if (input.endDate !== undefined) updateData.endDate = input.endDate;
    if (input.dosageNotes !== undefined) updateData.dosageNotes = input.dosageNotes;

    // Build access check subquery - check via medication -> recipient -> access pattern
    const hasAccess = sql`EXISTS (
      SELECT 1 FROM ${medications}
      INNER JOIN ${careRecipients} ON ${careRecipients.id} = ${medications.recipientId}
      WHERE ${medications.id} = ${medicationSchedules.medicationId}
        AND (
          ${careRecipients.userId} = ${userId}
          OR ${careRecipients.createdByUserId} = ${userId}
          OR EXISTS (
            SELECT 1 FROM ${caregiverAccess}
            WHERE ${caregiverAccess.caregiverUserId} = ${userId}
              AND ${caregiverAccess.recipientUserId} = ${careRecipients.userId}
              AND ${caregiverAccess.status} = 'approved'
          )
        )
    )`;

    const rows = await this.db
      .update(medicationSchedules)
      .set(updateData)
      .where(and(eq(medicationSchedules.id, scheduleId), hasAccess))
      .returning();

    return rows[0] ? toDomain(rows[0]) : null;
  }

  /**
   * Counts active schedules for a medication.
   * A schedule is considered active if it has no endDate or if endDate is in the future.
   *
   * @param userId - The authenticated user's ID
   * @param medicationId - The medication's UUID
   * @returns Count of active schedules
   */
  async countActiveByMedication(userId: UserId, medicationId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0]!;

    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(medicationSchedules)
      .innerJoin(medications, eq(medicationSchedules.medicationId, medications.id))
      .innerJoin(careRecipients, eq(medications.recipientId, careRecipients.id))
      .where(
        and(
          eq(medicationSchedules.medicationId, medicationId),
          buildRecipientAccessCheck(userId),
          // Active if no endDate or endDate >= today
          or(isNull(medicationSchedules.endDate), gt(medicationSchedules.endDate, today))
        )
      );

    return result[0]?.count ?? 0;
  }
}

