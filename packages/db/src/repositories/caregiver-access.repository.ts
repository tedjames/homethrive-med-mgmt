/**
 * Drizzle ORM implementation of CaregiverAccessRepository.
 *
 * ## Purpose
 *
 * Manages caregiver access relationships between users. A caregiver can request
 * access to a care recipient's profile, or a recipient can invite a caregiver.
 *
 * ## State Machine
 *
 * - pending_request: Caregiver requested access, awaiting recipient approval
 * - pending_invite: Recipient invited caregiver, awaiting caregiver acceptance
 * - approved: Active access granted
 * - revoked: Access was revoked, denied, or cancelled
 *
 * @see CaregiverAccessRepository interface in @homethrive/core for the full contract
 */
import type {
  AccessStatus,
  CaregiverAccess,
  CaregiverAccessRepository,
  CaregiverAccessWithUser,
  UserId,
  UserLookup,
} from '@homethrive/core';
import { and, eq, ne } from 'drizzle-orm';

import type { DbClient } from '../connection.js';
import { caregiverAccess, users } from '../schema/core.js';

/**
 * Maps a database row to the domain CaregiverAccess type.
 */
function toDomain(row: typeof caregiverAccess.$inferSelect): CaregiverAccess {
  return {
    id: row.id,
    caregiverUserId: row.caregiverUserId,
    recipientUserId: row.recipientUserId,
    status: row.status,
    requestedAt: row.requestedAt,
    approvedAt: row.approvedAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleCaregiverAccessRepository implements CaregiverAccessRepository {
  constructor(private readonly db: DbClient) {}

  /**
   * Find a user by their email address.
   */
  async findUserByEmail(email: string): Promise<UserLookup | null> {
    const rows = await this.db
      .select({
        clerkUserId: users.clerkUserId,
        email: users.email,
        displayName: users.displayName,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Find an access relationship by ID.
   */
  async findById(accessId: string): Promise<CaregiverAccess | null> {
    const rows = await this.db
      .select()
      .from(caregiverAccess)
      .where(eq(caregiverAccess.id, accessId))
      .limit(1);

    return rows[0] ? toDomain(rows[0]) : null;
  }

  /**
   * Find an active (non-revoked) access relationship between two users.
   */
  async findActiveAccess(
    caregiverUserId: UserId,
    recipientUserId: UserId
  ): Promise<CaregiverAccess | null> {
    const rows = await this.db
      .select()
      .from(caregiverAccess)
      .where(
        and(
          eq(caregiverAccess.caregiverUserId, caregiverUserId),
          eq(caregiverAccess.recipientUserId, recipientUserId),
          ne(caregiverAccess.status, 'revoked')
        )
      )
      .limit(1);

    return rows[0] ? toDomain(rows[0]) : null;
  }

  /**
   * Check if a user has approved access to a recipient.
   */
  async hasApprovedAccess(caregiverUserId: UserId, recipientUserId: UserId): Promise<boolean> {
    const rows = await this.db
      .select({ id: caregiverAccess.id })
      .from(caregiverAccess)
      .where(
        and(
          eq(caregiverAccess.caregiverUserId, caregiverUserId),
          eq(caregiverAccess.recipientUserId, recipientUserId),
          eq(caregiverAccess.status, 'approved')
        )
      )
      .limit(1);

    return rows.length > 0;
  }

  /**
   * Get all recipient user IDs that a caregiver has approved access to.
   * This is used to build the list of accessible recipients.
   */
  async getApprovedRecipientUserIds(caregiverUserId: UserId): Promise<string[]> {
    const rows = await this.db
      .select({ recipientUserId: caregiverAccess.recipientUserId })
      .from(caregiverAccess)
      .where(
        and(
          eq(caregiverAccess.caregiverUserId, caregiverUserId),
          eq(caregiverAccess.status, 'approved')
        )
      );

    return rows.map((row) => row.recipientUserId);
  }

  /**
   * List all caregivers for a recipient (with user details).
   * Returns all non-revoked relationships.
   */
  async listCaregiversForRecipient(recipientUserId: UserId): Promise<CaregiverAccessWithUser[]> {
    const rows = await this.db
      .select({
        access: caregiverAccess,
        caregiverDisplayName: users.displayName,
        caregiverEmail: users.email,
      })
      .from(caregiverAccess)
      .leftJoin(users, eq(caregiverAccess.caregiverUserId, users.clerkUserId))
      .where(
        and(
          eq(caregiverAccess.recipientUserId, recipientUserId),
          ne(caregiverAccess.status, 'revoked')
        )
      );

    return rows.map((row) => ({
      ...toDomain(row.access),
      caregiverDisplayName: row.caregiverDisplayName,
      caregiverEmail: row.caregiverEmail,
      recipientDisplayName: null, // Not needed when listing for recipient
      recipientEmail: null,
    }));
  }

  /**
   * List all care recipients a user is caregiver for (with user details).
   * Returns all non-revoked relationships.
   */
  async listRecipientsForCaregiver(caregiverUserId: UserId): Promise<CaregiverAccessWithUser[]> {
    const rows = await this.db
      .select({
        access: caregiverAccess,
        recipientDisplayName: users.displayName,
        recipientEmail: users.email,
      })
      .from(caregiverAccess)
      .leftJoin(users, eq(caregiverAccess.recipientUserId, users.clerkUserId))
      .where(
        and(
          eq(caregiverAccess.caregiverUserId, caregiverUserId),
          ne(caregiverAccess.status, 'revoked')
        )
      );

    return rows.map((row) => ({
      ...toDomain(row.access),
      caregiverDisplayName: null, // Not needed when listing for caregiver
      caregiverEmail: null,
      recipientDisplayName: row.recipientDisplayName,
      recipientEmail: row.recipientEmail,
    }));
  }

  /**
   * Create a new access relationship.
   */
  async create(input: {
    caregiverUserId: UserId;
    recipientUserId: UserId;
    status: AccessStatus;
    requestedAt: Date;
  }): Promise<CaregiverAccess> {
    const rows = await this.db
      .insert(caregiverAccess)
      .values({
        caregiverUserId: input.caregiverUserId,
        recipientUserId: input.recipientUserId,
        status: input.status,
        requestedAt: input.requestedAt,
      })
      .returning();

    return toDomain(rows[0]!);
  }

  /**
   * Update the status of an access relationship.
   */
  async updateStatus(
    accessId: string,
    status: AccessStatus,
    timestamps: {
      approvedAt?: Date;
      revokedAt?: Date;
    }
  ): Promise<CaregiverAccess | null> {
    const updateValues: Partial<typeof caregiverAccess.$inferInsert> = {
      status,
      updatedAt: new Date(),
    };

    if (timestamps.approvedAt !== undefined) {
      updateValues.approvedAt = timestamps.approvedAt;
    }
    if (timestamps.revokedAt !== undefined) {
      updateValues.revokedAt = timestamps.revokedAt;
    }

    const rows = await this.db
      .update(caregiverAccess)
      .set(updateValues)
      .where(eq(caregiverAccess.id, accessId))
      .returning();

    return rows[0] ? toDomain(rows[0]) : null;
  }
}
