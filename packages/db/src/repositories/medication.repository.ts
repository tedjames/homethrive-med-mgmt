/**
 * Drizzle ORM implementation of MedicationRepository.
 *
 * ## Authorization Pattern
 *
 * All methods require a `userId` parameter and check access based on:
 * 1. User owns the recipient profile (careRecipients.userId = user)
 * 2. User created the recipient (careRecipients.createdByUserId = user) - deprecated
 * 3. User has approved caregiver access via caregiver_access table
 *
 * ## Key Invariants
 *
 * - **Medications can be permanently deleted**: Only after deactivation via `setInactive()`.
 *   Deletion cascades to schedules and dose history. Use `delete()` method.
 *
 * - **Atomic creation**: `createWithSchedules()` ensures a medication and its
 *   schedules are created together in a transaction, preventing orphaned records.
 *
 * @see MedicationRepository interface in @homethrive/core for the full contract
 */
import type {
  CreateMedicationInput,
  CreateScheduleInput,
  Medication,
  MedicationRepository,
  MedicationSchedule,
  UpdateMedicationInput,
  UserId,
} from '@homethrive/core';
import { CareRecipientNotFoundError } from '@homethrive/core';
import { and, asc, eq, or, sql } from 'drizzle-orm';

import type { DbClient } from '../connection.js';
import { caregiverAccess, careRecipients, medicationSchedules, medications } from '../schema/core.js';

/**
 * Maps a database schedule row to the domain MedicationSchedule type.
 */
/**
 * Maps a database schedule row to the domain MedicationSchedule type.
 */
function toScheduleDomain(
  row: typeof medicationSchedules.$inferSelect
): MedicationSchedule {
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
 * Maps a database medication row to the domain Medication type.
 */
function toDomain(row: typeof medications.$inferSelect): Medication {
  return {
    id: row.id,
    recipientId: row.recipientId,
    name: row.name,
    instructions: row.instructions ?? null,
    isActive: row.isActive,
    inactiveAt: row.inactiveAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

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

export class DrizzleMedicationRepository implements MedicationRepository {
  constructor(private readonly db: DbClient) {}

  /**
   * Atomically creates a medication with its associated schedules in a single transaction.
   *
   * @param userId - The authenticated user's ID (must have access to the care recipient)
   * @param recipientId - The care recipient this medication is for
   * @param medicationInput - Medication name and optional instructions
   * @param schedulesInput - Array of schedule definitions (recurrence, time, etc.)
   * @returns The created medication and its schedules
   * @throws {CareRecipientNotFoundError} If recipient doesn't exist or user lacks access
   *
   * @remarks
   * - Uses a database transaction to ensure atomicity
   * - Validates recipient access before creating (clearer errors than FK violation)
   */
  async createWithSchedules(
    userId: UserId,
    recipientId: string,
    medicationInput: CreateMedicationInput,
    schedulesInput: Array<Omit<CreateScheduleInput, 'medicationId'>>
  ): Promise<{ medication: Medication; schedules: MedicationSchedule[] }> {
    return this.db.transaction(async (tx: DbClient) => {
      // Verify recipient exists and user has access
      const recipientRows = await tx
        .select({ id: careRecipients.id })
        .from(careRecipients)
        .where(and(eq(careRecipients.id, recipientId), buildRecipientAccessCheck(userId)))
        .limit(1);

      if (recipientRows.length === 0) {
        throw new CareRecipientNotFoundError(recipientId);
      }

      const medRows = await tx
        .insert(medications)
        .values({
          createdByUserId: userId,
          recipientId,
          name: medicationInput.name,
          instructions: medicationInput.instructions ?? null,
        })
        .returning();

      const medication = toDomain(medRows[0]!);

      const scheduleRows =
        schedulesInput.length === 0
          ? []
          : await tx
              .insert(medicationSchedules)
              .values(
                schedulesInput.map((s) => ({
                  createdByUserId: userId,
                  medicationId: medication.id,
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

      return { medication, schedules: scheduleRows.map(toScheduleDomain) };
    });
  }

  /**
   * Finds a medication by ID, scoped to the authenticated user's access.
   *
   * @param userId - The authenticated user's ID
   * @param medicationId - The medication's UUID
   * @returns The medication if found and user has access to the recipient, null otherwise
   */
  async findById(userId: UserId, medicationId: string): Promise<Medication | null> {
    const rows = await this.db
      .select({ medication: medications })
      .from(medications)
      .innerJoin(careRecipients, eq(medications.recipientId, careRecipients.id))
      .where(and(eq(medications.id, medicationId), buildRecipientAccessCheck(userId)))
      .limit(1);

    return rows[0] ? toDomain(rows[0].medication) : null;
  }

  /**
   * Lists all medications for a care recipient, scoped to the authenticated user's access.
   *
   * @param userId - The authenticated user's ID
   * @param recipientId - The care recipient's UUID
   * @param options.includeInactive - If true, includes soft-deleted medications (default: false)
   * @returns Array of medications, ordered by creation date ascending
   */
  async listByRecipient(
    userId: UserId,
    recipientId: string,
    options?: { includeInactive?: boolean }
  ): Promise<Medication[]> {
    const includeInactive = options?.includeInactive ?? false;

    const accessConditions = [
      eq(medications.recipientId, recipientId),
      buildRecipientAccessCheck(userId),
    ];

    if (!includeInactive) {
      accessConditions.push(eq(medications.isActive, true));
    }

    const rows = await this.db
      .select({ medication: medications })
      .from(medications)
      .innerJoin(careRecipients, eq(medications.recipientId, careRecipients.id))
      .where(and(...accessConditions))
      .orderBy(asc(medications.createdAt));

    return rows.map((row) => toDomain(row.medication));
  }

  /**
   * Creates a medication without schedules.
   *
   * @param userId - The authenticated user's ID
   * @param recipientId - The care recipient this medication is for
   * @param input - Medication name and optional instructions
   * @returns The created medication
   *
   * @remarks
   * Prefer `createWithSchedules()` to ensure medications always have at least one schedule.
   * This method exists for cases where schedules are added separately.
   */
  async create(userId: UserId, recipientId: string, input: CreateMedicationInput): Promise<Medication> {
    const rows = await this.db
      .insert(medications)
      .values({
        createdByUserId: userId,
        recipientId,
        name: input.name,
        instructions: input.instructions ?? null,
      })
      .returning();

    return toDomain(rows[0]!);
  }

  /**
   * Updates a medication's name and/or instructions.
   *
   * @param userId - The authenticated user's ID
   * @param medicationId - The medication's UUID
   * @param input - Fields to update (only provided fields are changed)
   * @returns The updated medication if found and user has access, null otherwise
   */
  async update(userId: UserId, medicationId: string, input: UpdateMedicationInput): Promise<Medication | null> {
    const updates: Partial<typeof medications.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) {
      updates.name = input.name;
    }

    if (input.instructions !== undefined) {
      updates.instructions = input.instructions;
    }

    // Build access check subquery
    const hasAccess = sql`EXISTS (
      SELECT 1 FROM ${careRecipients}
      WHERE ${careRecipients.id} = ${medications.recipientId}
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
      .update(medications)
      .set(updates)
      .where(and(eq(medications.id, medicationId), hasAccess))
      .returning();

    return rows[0] ? toDomain(rows[0]) : null;
  }

  /**
   * Soft-deletes a medication by marking it inactive.
   *
   * @param userId - The authenticated user's ID
   * @param medicationId - The medication's UUID
   * @param inactiveAt - Timestamp when the medication became inactive
   * @returns The updated medication if found and user has access, null otherwise
   *
   * @remarks
   * Medications are never hard-deleted to preserve dose history for audit/compliance.
   * Use `listByRecipient({ includeInactive: true })` to see inactive medications.
   */
  async setInactive(userId: UserId, medicationId: string, inactiveAt: Date): Promise<Medication | null> {
    // Build access check subquery
    const hasAccess = sql`EXISTS (
      SELECT 1 FROM ${careRecipients}
      WHERE ${careRecipients.id} = ${medications.recipientId}
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
      .update(medications)
      .set({
        isActive: false,
        inactiveAt,
        updatedAt: new Date(),
      })
      .where(and(eq(medications.id, medicationId), hasAccess))
      .returning();

    return rows[0] ? toDomain(rows[0]) : null;
  }

  /**
   * Reactivates an inactive medication by marking it active again.
   *
   * @param userId - The authenticated user's ID
   * @param medicationId - The medication's UUID
   * @returns The updated medication if found and user has access, null otherwise
   */
  async setActive(userId: UserId, medicationId: string): Promise<Medication | null> {
    // Build access check subquery
    const hasAccess = sql`EXISTS (
      SELECT 1 FROM ${careRecipients}
      WHERE ${careRecipients.id} = ${medications.recipientId}
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
      .update(medications)
      .set({
        isActive: true,
        inactiveAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(medications.id, medicationId), hasAccess))
      .returning();

    return rows[0] ? toDomain(rows[0]) : null;
  }

  /**
   * Permanently deletes a medication and all associated data.
   *
   * Related data (schedules, dose_taken) is automatically deleted via ON DELETE CASCADE.
   *
   * @param userId - The authenticated user's ID
   * @param medicationId - The medication's UUID
   * @returns true if deletion succeeded, false if medication not found or user lacks access
   */
  async delete(userId: UserId, medicationId: string): Promise<boolean> {
    // Build access check subquery
    const hasAccess = sql`EXISTS (
      SELECT 1 FROM ${careRecipients}
      WHERE ${careRecipients.id} = ${medications.recipientId}
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
      .delete(medications)
      .where(and(eq(medications.id, medicationId), hasAccess))
      .returning({ id: medications.id });

    return rows.length > 0;
  }
}

