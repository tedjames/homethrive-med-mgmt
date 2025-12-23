/**
 * Drizzle ORM implementation of CareRecipientRepository.
 *
 * ## Authorization Pattern
 *
 * All methods require a `userId` parameter and filter queries by `createdByUserId`
 * to ensure caregivers can only access their own care recipients. This is enforced
 * at the database query level for defense-in-depth.
 *
 * ## Timezone Handling
 *
 * Each care recipient has a `timezone` field (IANA format, e.g., "America/New_York")
 * that determines how medication schedules are interpreted for that person.
 * Defaults to "America/New_York" if not specified during creation.
 *
 * @see CareRecipientRepository interface in @homethrive/core for the full contract
 */
import type {
  CareRecipient,
  CareRecipientRepository,
  CreateCareRecipientInput,
  UpdateCareRecipientInput,
  UserId,
} from '@homethrive/core';
import { and, asc, eq } from 'drizzle-orm';

import type { DbClient } from '../connection.js';
import { careRecipients } from '../schema/core.js';

/**
 * Maps a database care recipient row to the domain CareRecipient type.
 */
function toDomain(row: typeof careRecipients.$inferSelect): CareRecipient {
  return {
    id: row.id,
    createdByUserId: row.createdByUserId,
    displayName: row.displayName,
    timezone: row.timezone,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleCareRecipientRepository implements CareRecipientRepository {
  constructor(private readonly db: DbClient) {}

  /**
   * Finds a care recipient by ID, scoped to the authenticated user.
   *
   * @param userId - The authenticated user's ID
   * @param recipientId - The care recipient's UUID
   * @returns The care recipient if found and owned by user, null otherwise
   */
  async findById(userId: UserId, recipientId: string): Promise<CareRecipient | null> {
    const rows = await this.db
      .select()
      .from(careRecipients)
      .where(and(eq(careRecipients.id, recipientId), eq(careRecipients.createdByUserId, userId)))
      .limit(1);

    return rows[0] ? toDomain(rows[0]) : null;
  }

  /**
   * Lists all care recipients for a caregiver.
   *
   * @param userId - The authenticated user's ID
   * @returns Array of care recipients, ordered by creation date ascending
   */
  async listForCaregiver(userId: UserId): Promise<CareRecipient[]> {
    const rows = await this.db
      .select()
      .from(careRecipients)
      .where(eq(careRecipients.createdByUserId, userId))
      .orderBy(asc(careRecipients.createdAt));

    return rows.map(toDomain);
  }

  /**
   * Creates a new care recipient for the authenticated caregiver.
   *
   * @param userId - The authenticated user's ID (becomes `createdByUserId`)
   * @param input - Care recipient data
   * @param input.displayName - Name to display for this care recipient
   * @param input.timezone - IANA timezone (defaults to "America/New_York")
   * @returns The created care recipient
   */
  async create(
    userId: UserId,
    input: CreateCareRecipientInput
  ): Promise<CareRecipient> {
    const timezone = input.timezone ?? 'America/New_York';

    const rows = await this.db
      .insert(careRecipients)
      .values({
        createdByUserId: userId,
        displayName: input.displayName,
        timezone,
      })
      .returning();

    // Postgres will always return one row on successful insert.
    return toDomain(rows[0]!);
  }

  /**
   * Updates a care recipient's display name and/or timezone.
   *
   * @param userId - The authenticated user's ID
   * @param recipientId - The care recipient's UUID
   * @param input - Fields to update (only provided fields are changed)
   * @returns The updated care recipient if found and owned by user, null otherwise
   */
  async update(
    userId: UserId,
    recipientId: string,
    input: UpdateCareRecipientInput
  ): Promise<CareRecipient | null> {
    const updates: Partial<typeof careRecipients.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (input.displayName !== undefined) {
      updates.displayName = input.displayName;
    }

    if (input.timezone !== undefined) {
      updates.timezone = input.timezone;
    }

    const rows = await this.db
      .update(careRecipients)
      .set(updates)
      .where(and(eq(careRecipients.id, recipientId), eq(careRecipients.createdByUserId, userId)))
      .returning();

    return rows[0] ? toDomain(rows[0]) : null;
  }
}

