/**
 * Caregiver access domain entity types.
 *
 * Represents the relationship between a caregiver and a care recipient (user).
 * Care recipients control their own profile and grant access to caregivers.
 *
 * State machine:
 * - pending_request: Caregiver requested access, awaiting recipient approval
 * - pending_invite: Recipient invited caregiver, awaiting caregiver acceptance
 * - approved: Active access granted
 * - revoked: Access was revoked, denied, or cancelled
 */

/**
 * Possible states for an access relationship.
 */
export type AccessStatus = 'pending_request' | 'pending_invite' | 'approved' | 'revoked';

/**
 * Represents a caregiver access relationship.
 */
export interface CaregiverAccess {
  id: string;
  /**
   * The user who is the caregiver (requesting or granted access).
   */
  caregiverUserId: string;
  /**
   * The user who is the care recipient (granting access).
   */
  recipientUserId: string;
  /**
   * Current status of the access relationship.
   */
  status: AccessStatus;
  /**
   * When the access was first requested or invited.
   */
  requestedAt: Date | null;
  /**
   * When the access was approved/accepted.
   */
  approvedAt: Date | null;
  /**
   * When the access was revoked.
   */
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Extended access with user details for display.
 */
export interface CaregiverAccessWithUser extends CaregiverAccess {
  /**
   * Display name of the caregiver user.
   */
  caregiverDisplayName: string | null;
  /**
   * Email of the caregiver user.
   */
  caregiverEmail: string | null;
  /**
   * Display name of the recipient user.
   */
  recipientDisplayName: string | null;
  /**
   * Email of the recipient user.
   */
  recipientEmail: string | null;
}

/**
 * Input for requesting access to a care recipient by email.
 */
export interface RequestAccessInput {
  recipientEmail: string;
}

/**
 * Input for inviting a caregiver by email.
 */
export interface InviteCaregiverInput {
  caregiverEmail: string;
}
