/**
 * Drizzle ORM implementation for user record management.
 *
 * ## Authentication Integration
 *
 * This repository manages the local user records that correspond to Clerk
 * authentication. The `clerkUserId` field is the canonical identifier that
 * links our database records to Clerk's user management.
 *
 * ## Upsert Pattern
 *
 * The `upsert()` method is designed for use during authentication flows:
 * - On first login, creates a new user record
 * - On subsequent logins, updates profile fields if they've changed in Clerk
 * - Uses Postgres `ON CONFLICT DO UPDATE` for atomic upsert behavior
 *
 * ## Note on Interface
 *
 * Unlike other repositories, this does not implement a core domain interface
 * because user management is infrastructure-specific (tied to Clerk).
 */
import { eq } from 'drizzle-orm';

import type { DbClient } from '../connection.js';
import { users } from '../schema/core.js';

/**
 * Input for creating or updating a user record.
 * Only `clerkUserId` is required; other fields update only when provided.
 */
export type UpsertUserInput = {
  clerkUserId: string;
  email?: string | null;
  displayName?: string | null;
  imageUrl?: string | null;
};

/**
 * Input for completing user onboarding.
 */
export type CompleteOnboardingInput = {
  displayName: string;
  timezone: string;
  isRecipient: boolean;
  isCaregiver: boolean;
};

/**
 * Input for updating user roles.
 */
export type UpdateRolesInput = {
  isRecipient: boolean;
  isCaregiver: boolean;
};

export class DrizzleUserRepository {
  constructor(private readonly db: DbClient) {}

  /**
   * Finds a user by their Clerk user ID.
   *
   * @param clerkUserId - The Clerk-issued user identifier (e.g., "user_2abc123...")
   * @returns The user record if found, null otherwise
   */
  async findByClerkUserId(clerkUserId: string): Promise<typeof users.$inferSelect | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Creates or updates a user record from an authenticated request context.
   *
   * @param input - User data from Clerk authentication
   * @param input.clerkUserId - The Clerk-issued user identifier (required)
   * @param input.email - User's email address (optional, only updates if provided)
   * @param input.displayName - User's display name (optional, only updates if provided)
   * @param input.imageUrl - User's profile image URL (optional, only updates if provided)
   * @returns The created or updated user record
   *
   * @remarks
   * - Uses Postgres `ON CONFLICT DO UPDATE` for atomic upsert behavior
   * - Only provided fields are updated; undefined values don't overwrite existing data
   * - `updatedAt` is always set to the current timestamp
   */
  async upsert(input: UpsertUserInput): Promise<typeof users.$inferSelect> {
    const now = new Date();

    const insertValues: typeof users.$inferInsert = {
      clerkUserId: input.clerkUserId,
      updatedAt: now,
    };

    const updateSet: Partial<typeof users.$inferInsert> = {
      updatedAt: now,
    };

    if (input.email !== undefined) {
      insertValues.email = input.email;
      updateSet.email = input.email;
    }

    if (input.displayName !== undefined) {
      insertValues.displayName = input.displayName;
      updateSet.displayName = input.displayName;
    }

    if (input.imageUrl !== undefined) {
      insertValues.imageUrl = input.imageUrl;
      updateSet.imageUrl = input.imageUrl;
    }

    const rows = await this.db
      .insert(users)
      .values(insertValues)
      .onConflictDoUpdate({ target: users.clerkUserId, set: updateSet })
      .returning();

    // Postgres will always return one row on successful insert/update.
    return rows[0]!;
  }

  /**
   * Completes user onboarding with profile data.
   * Sets hasCompletedOnboarding to true.
   *
   * @param clerkUserId - The Clerk-issued user identifier
   * @param input - Onboarding data (display name, timezone, roles)
   * @returns The updated user record
   * @throws Error if user is not found
   */
  async completeOnboarding(
    clerkUserId: string,
    input: CompleteOnboardingInput
  ): Promise<typeof users.$inferSelect> {
    const now = new Date();

    const rows = await this.db
      .update(users)
      .set({
        displayName: input.displayName,
        timezone: input.timezone,
        isRecipient: input.isRecipient,
        isCaregiver: input.isCaregiver,
        hasCompletedOnboarding: true,
        updatedAt: now,
      })
      .where(eq(users.clerkUserId, clerkUserId))
      .returning();

    if (!rows[0]) {
      throw new Error(`User not found: ${clerkUserId}`);
    }

    return rows[0];
  }

  /**
   * Updates user roles.
   *
   * @param clerkUserId - The Clerk-issued user identifier
   * @param input - Role update data
   * @returns The updated user record
   * @throws Error if user is not found
   */
  async updateRoles(
    clerkUserId: string,
    input: UpdateRolesInput
  ): Promise<typeof users.$inferSelect> {
    const now = new Date();

    const rows = await this.db
      .update(users)
      .set({
        isRecipient: input.isRecipient,
        isCaregiver: input.isCaregiver,
        updatedAt: now,
      })
      .where(eq(users.clerkUserId, clerkUserId))
      .returning();

    if (!rows[0]) {
      throw new Error(`User not found: ${clerkUserId}`);
    }

    return rows[0];
  }
}


