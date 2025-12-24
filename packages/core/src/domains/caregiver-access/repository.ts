/**
 * Caregiver access repository interface (port).
 */

import type { UserId } from '../../shared/types.js';
import type { AccessStatus, CaregiverAccess, CaregiverAccessWithUser } from './entity.js';

/**
 * User lookup result for email-based operations.
 */
export interface UserLookup {
  clerkUserId: string;
  email: string | null;
  displayName: string | null;
}

/**
 * Repository interface for caregiver access relationships.
 */
export interface CaregiverAccessRepository {
  /**
   * Find a user by their email address.
   * Returns null if no user with that email exists.
   */
  findUserByEmail(email: string): Promise<UserLookup | null>;

  /**
   * Find an access relationship by ID.
   */
  findById(accessId: string): Promise<CaregiverAccess | null>;

  /**
   * Find an active (non-revoked) access relationship between two users.
   */
  findActiveAccess(caregiverUserId: UserId, recipientUserId: UserId): Promise<CaregiverAccess | null>;

  /**
   * Check if a user has approved access to a recipient.
   */
  hasApprovedAccess(caregiverUserId: UserId, recipientUserId: UserId): Promise<boolean>;

  /**
   * List all caregivers for a recipient (with user details).
   * Includes pending requests and approved relationships.
   */
  listCaregiversForRecipient(recipientUserId: UserId): Promise<CaregiverAccessWithUser[]>;

  /**
   * List all care recipients a user is caregiver for (with user details).
   * Includes pending invites and approved relationships.
   */
  listRecipientsForCaregiver(caregiverUserId: UserId): Promise<CaregiverAccessWithUser[]>;

  /**
   * Create a new access relationship.
   */
  create(input: {
    caregiverUserId: UserId;
    recipientUserId: UserId;
    status: AccessStatus;
    requestedAt: Date;
  }): Promise<CaregiverAccess>;

  /**
   * Update the status of an access relationship.
   */
  updateStatus(
    accessId: string,
    status: AccessStatus,
    timestamps: {
      approvedAt?: Date;
      revokedAt?: Date;
    }
  ): Promise<CaregiverAccess | null>;
}
