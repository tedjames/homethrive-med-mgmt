/**
 * Drizzle ORM implementation of CareRecipientRepository.
 *
 * ## Authorization Pattern
 *
 * All methods require a `userId` parameter and check access based on:
 * 1. The user owns the recipient profile (userId = user) - new model
 * 2. The user created the recipient (createdByUserId = user) - deprecated/backwards compat
 * 3. The user has approved caregiver access via caregiver_access table
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
import { and, asc, eq, or, sql } from 'drizzle-orm';

import type { DbClient } from '../connection.js';
import { caregiverAccess, careRecipients } from '../schema/core.js';

/**
 * Maps a database care recipient row to the domain CareRecipient type.
 */
function toDomain(row: typeof careRecipients.$inferSelect): CareRecipient {
  return {
    id: row.id,
    userId: row.userId,
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
   * Finds the user's own care recipient profile by userId.
   *
   * @param userId - The user's ID
   * @returns The user's own profile, or null if not found
   */
  async findByUserId(userId: UserId): Promise<CareRecipient | null> {
    const rows = await this.db
      .select()
      .from(careRecipients)
      .where(eq(careRecipients.userId, userId))
      .limit(1);

    return rows[0] ? toDomain(rows[0]) : null;
  }

  /**
   * Finds a care recipient by ID, scoped to the authenticated user.
   *
   * User has access if:
   * 1. They own the recipient profile (userId = user)
   * 2. They created the recipient (createdByUserId = user) - deprecated
   * 3. They have approved caregiver access
   *
   * @param userId - The authenticated user's ID
   * @param recipientId - The care recipient's UUID
   * @returns The care recipient if found and user has access, null otherwise
   */
  async findById(userId: UserId, recipientId: string): Promise<CareRecipient | null> {
    // Build the access check: user owns it, created it, or has approved caregiver access
    const hasApprovedAccess = sql`EXISTS (
      SELECT 1 FROM ${caregiverAccess}
      WHERE ${caregiverAccess.caregiverUserId} = ${userId}
        AND ${caregiverAccess.recipientUserId} = ${careRecipients.userId}
        AND ${caregiverAccess.status} = 'approved'
    )`;

    const rows = await this.db
      .select()
      .from(careRecipients)
      .where(
        and(
          eq(careRecipients.id, recipientId),
          or(
            eq(careRecipients.userId, userId), // I am the recipient
            eq(careRecipients.createdByUserId, userId), // I created it (deprecated)
            hasApprovedAccess // I have caregiver access
          )
        )
      )
      .limit(1);

    return rows[0] ? toDomain(rows[0]) : null;
  }

  /**
   * Lists all care recipients the user can access.
   *
   * Returns recipients where:
   * 1. The user owns the profile (userId = user) - new model
   * 2. The user created the recipient (createdByUserId = user) - deprecated
   * 3. The user has approved caregiver access
   *
   * @param userId - The authenticated user's ID
   * @returns Array of care recipients, ordered by creation date ascending
   */
  async listForCaregiver(userId: UserId): Promise<CareRecipient[]> {
    // Build the access check: user owns it, created it, or has approved caregiver access
    const hasApprovedAccess = sql`EXISTS (
      SELECT 1 FROM ${caregiverAccess}
      WHERE ${caregiverAccess.caregiverUserId} = ${userId}
        AND ${caregiverAccess.recipientUserId} = ${careRecipients.userId}
        AND ${caregiverAccess.status} = 'approved'
    )`;

    const rows = await this.db
      .select()
      .from(careRecipients)
      .where(
        or(
          eq(careRecipients.userId, userId), // I am the recipient
          eq(careRecipients.createdByUserId, userId), // I created it (deprecated)
          hasApprovedAccess // I have caregiver access
        )
      )
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
   * User can update if:
   * 1. They own the recipient profile (userId = user)
   * 2. They created the recipient (createdByUserId = user) - deprecated
   * 3. They have approved caregiver access
   *
   * @param userId - The authenticated user's ID
   * @param recipientId - The care recipient's UUID
   * @param input - Fields to update (only provided fields are changed)
   * @returns The updated care recipient if found and user has access, null otherwise
   */
  /**
   * Finds or creates the user's own care recipient profile.
   *
   * In the new model, every user IS a care recipient who controls their own profile.
   * This method ensures a profile exists for the user when they first sign in.
   *
   * @param userId - The user's ID (becomes the profile owner)
   * @param displayName - Display name to use if creating a new profile
   * @returns The user's care recipient profile
   */
  async findOrCreateOwnProfile(
    userId: UserId,
    displayName: string
  ): Promise<CareRecipient> {
    // First, try to find existing profile
    const existing = await this.db
      .select()
      .from(careRecipients)
      .where(eq(careRecipients.userId, userId))
      .limit(1);

    if (existing[0]) {
      return toDomain(existing[0]);
    }

    // Create new profile for the user
    const rows = await this.db
      .insert(careRecipients)
      .values({
        userId,
        displayName,
        timezone: 'America/New_York',
      })
      .returning();

    return toDomain(rows[0]!);
  }

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

    // Build the access check: user owns it, created it, or has approved caregiver access
    const hasApprovedAccess = sql`EXISTS (
      SELECT 1 FROM ${caregiverAccess}
      WHERE ${caregiverAccess.caregiverUserId} = ${userId}
        AND ${caregiverAccess.recipientUserId} = ${careRecipients.userId}
        AND ${caregiverAccess.status} = 'approved'
    )`;

    const rows = await this.db
      .update(careRecipients)
      .set(updates)
      .where(
        and(
          eq(careRecipients.id, recipientId),
          or(
            eq(careRecipients.userId, userId), // I am the recipient
            eq(careRecipients.createdByUserId, userId), // I created it (deprecated)
            hasApprovedAccess // I have caregiver access
          )
        )
      )
      .returning();

    return rows[0] ? toDomain(rows[0]) : null;
  }
}

