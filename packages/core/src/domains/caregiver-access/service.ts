/**
 * Caregiver access domain service.
 *
 * Provides business logic for managing caregiver access relationships.
 * Care recipients (users) control their own profiles and can grant access
 * to caregivers via requests or invites.
 *
 * Flow:
 * - Request: Caregiver requests access → recipient approves → approved
 * - Invite: Recipient invites caregiver → caregiver accepts → approved
 * - Either party can revoke/deny/cancel → revoked
 *
 * @module caregiver-access/service
 */

import type { UserId } from '../../shared/types.js';
import type {
  CaregiverAccess,
  CaregiverAccessWithUser,
  InviteCaregiverInput,
  RequestAccessInput,
} from './entity.js';
import {
  AccessAlreadyExistsError,
  AccessNotAuthorizedError,
  AccessNotFoundError,
  InvalidAccessStateError,
  SelfAccessError,
  UserNotFoundByEmailError,
} from './errors.js';
import type { CaregiverAccessRepository } from './repository.js';

/**
 * Creates a caregiver access service instance with the provided repository.
 *
 * @param repo - The caregiver access repository implementation
 * @returns Service object with access management methods
 */
export function createCaregiverAccessService(repo: CaregiverAccessRepository) {
  /**
   * Request access to a care recipient (caregiver → recipient email).
   *
   * @param caregiverUserId - The caregiver's user ID
   * @param input - Contains the recipient's email
   * @returns The created access relationship (status = 'pending_request')
   * @throws {UserNotFoundByEmailError} If the recipient email is not found
   * @throws {SelfAccessError} If trying to request access to yourself
   * @throws {AccessAlreadyExistsError} If an active relationship already exists
   */
  async function requestAccess(
    caregiverUserId: UserId,
    input: RequestAccessInput
  ): Promise<CaregiverAccess> {
    // Look up recipient by email
    const recipientUser = await repo.findUserByEmail(input.recipientEmail);
    if (!recipientUser) {
      throw new UserNotFoundByEmailError(input.recipientEmail);
    }

    // Cannot request access to yourself
    if (recipientUser.clerkUserId === caregiverUserId) {
      throw new SelfAccessError();
    }

    // Check for existing active relationship
    const existingAccess = await repo.findActiveAccess(caregiverUserId, recipientUser.clerkUserId);
    if (existingAccess) {
      throw new AccessAlreadyExistsError(caregiverUserId, recipientUser.clerkUserId);
    }

    // Create the pending request
    return repo.create({
      caregiverUserId,
      recipientUserId: recipientUser.clerkUserId,
      status: 'pending_request',
      requestedAt: new Date(),
    });
  }

  /**
   * Invite a caregiver to access your profile (recipient → caregiver email).
   *
   * @param recipientUserId - The recipient's user ID (the one inviting)
   * @param input - Contains the caregiver's email
   * @returns The created access relationship (status = 'pending_invite')
   * @throws {UserNotFoundByEmailError} If the caregiver email is not found
   * @throws {SelfAccessError} If trying to invite yourself
   * @throws {AccessAlreadyExistsError} If an active relationship already exists
   */
  async function inviteCaregiver(
    recipientUserId: UserId,
    input: InviteCaregiverInput
  ): Promise<CaregiverAccess> {
    // Look up caregiver by email
    const caregiverUser = await repo.findUserByEmail(input.caregiverEmail);
    if (!caregiverUser) {
      throw new UserNotFoundByEmailError(input.caregiverEmail);
    }

    // Cannot invite yourself
    if (caregiverUser.clerkUserId === recipientUserId) {
      throw new SelfAccessError();
    }

    // Check for existing active relationship
    const existingAccess = await repo.findActiveAccess(caregiverUser.clerkUserId, recipientUserId);
    if (existingAccess) {
      throw new AccessAlreadyExistsError(caregiverUser.clerkUserId, recipientUserId);
    }

    // Create the pending invite
    return repo.create({
      caregiverUserId: caregiverUser.clerkUserId,
      recipientUserId,
      status: 'pending_invite',
      requestedAt: new Date(),
    });
  }

  /**
   * Approve a pending access request (recipient approves caregiver's request).
   *
   * @param recipientUserId - The recipient's user ID
   * @param accessId - The access relationship ID
   * @returns The updated access relationship (status = 'approved')
   * @throws {AccessNotFoundError} If access not found
   * @throws {AccessNotAuthorizedError} If user is not the recipient
   * @throws {InvalidAccessStateError} If access is not in 'pending_request' state
   */
  async function approveRequest(
    recipientUserId: UserId,
    accessId: string
  ): Promise<CaregiverAccess> {
    const access = await repo.findById(accessId);
    if (!access) {
      throw new AccessNotFoundError(accessId);
    }

    // Only the recipient can approve
    if (access.recipientUserId !== recipientUserId) {
      throw new AccessNotAuthorizedError(accessId, 'approve');
    }

    // Must be in pending_request state
    if (access.status !== 'pending_request') {
      throw new InvalidAccessStateError(accessId, access.status, 'pending_request');
    }

    const updated = await repo.updateStatus(accessId, 'approved', {
      approvedAt: new Date(),
    });
    if (!updated) {
      throw new AccessNotFoundError(accessId);
    }
    return updated;
  }

  /**
   * Accept a pending invite (caregiver accepts recipient's invite).
   *
   * @param caregiverUserId - The caregiver's user ID
   * @param accessId - The access relationship ID
   * @returns The updated access relationship (status = 'approved')
   * @throws {AccessNotFoundError} If access not found
   * @throws {AccessNotAuthorizedError} If user is not the caregiver
   * @throws {InvalidAccessStateError} If access is not in 'pending_invite' state
   */
  async function acceptInvite(
    caregiverUserId: UserId,
    accessId: string
  ): Promise<CaregiverAccess> {
    const access = await repo.findById(accessId);
    if (!access) {
      throw new AccessNotFoundError(accessId);
    }

    // Only the caregiver can accept
    if (access.caregiverUserId !== caregiverUserId) {
      throw new AccessNotAuthorizedError(accessId, 'accept');
    }

    // Must be in pending_invite state
    if (access.status !== 'pending_invite') {
      throw new InvalidAccessStateError(accessId, access.status, 'pending_invite');
    }

    const updated = await repo.updateStatus(accessId, 'approved', {
      approvedAt: new Date(),
    });
    if (!updated) {
      throw new AccessNotFoundError(accessId);
    }
    return updated;
  }

  /**
   * Revoke access (recipient revokes a caregiver's access or denies a request).
   *
   * @param recipientUserId - The recipient's user ID
   * @param accessId - The access relationship ID
   * @returns The updated access relationship (status = 'revoked')
   * @throws {AccessNotFoundError} If access not found
   * @throws {AccessNotAuthorizedError} If user is not the recipient
   * @throws {InvalidAccessStateError} If access is already revoked
   */
  async function revokeAccess(
    recipientUserId: UserId,
    accessId: string
  ): Promise<CaregiverAccess> {
    const access = await repo.findById(accessId);
    if (!access) {
      throw new AccessNotFoundError(accessId);
    }

    // Only the recipient can revoke
    if (access.recipientUserId !== recipientUserId) {
      throw new AccessNotAuthorizedError(accessId, 'revoke');
    }

    // Cannot revoke if already revoked
    if (access.status === 'revoked') {
      throw new InvalidAccessStateError(accessId, access.status, ['pending_request', 'pending_invite', 'approved']);
    }

    const updated = await repo.updateStatus(accessId, 'revoked', {
      revokedAt: new Date(),
    });
    if (!updated) {
      throw new AccessNotFoundError(accessId);
    }
    return updated;
  }

  /**
   * Cancel access (caregiver cancels their request or declines an invite).
   *
   * @param caregiverUserId - The caregiver's user ID
   * @param accessId - The access relationship ID
   * @returns The updated access relationship (status = 'revoked')
   * @throws {AccessNotFoundError} If access not found
   * @throws {AccessNotAuthorizedError} If user is not the caregiver
   * @throws {InvalidAccessStateError} If access is already approved or revoked
   */
  async function cancelAccess(
    caregiverUserId: UserId,
    accessId: string
  ): Promise<CaregiverAccess> {
    const access = await repo.findById(accessId);
    if (!access) {
      throw new AccessNotFoundError(accessId);
    }

    // Only the caregiver can cancel
    if (access.caregiverUserId !== caregiverUserId) {
      throw new AccessNotAuthorizedError(accessId, 'cancel');
    }

    // Can only cancel pending states
    if (access.status !== 'pending_request' && access.status !== 'pending_invite') {
      throw new InvalidAccessStateError(accessId, access.status, ['pending_request', 'pending_invite']);
    }

    const updated = await repo.updateStatus(accessId, 'revoked', {
      revokedAt: new Date(),
    });
    if (!updated) {
      throw new AccessNotFoundError(accessId);
    }
    return updated;
  }

  /**
   * List caregivers for the current user (as a recipient).
   * Returns all non-revoked access relationships with user details.
   *
   * @param recipientUserId - The recipient's user ID
   * @returns Array of access relationships with caregiver user details
   */
  async function listCaregivers(recipientUserId: UserId): Promise<CaregiverAccessWithUser[]> {
    return repo.listCaregiversForRecipient(recipientUserId);
  }

  /**
   * List care recipients the current user is caregiver for.
   * Returns all non-revoked access relationships with user details.
   *
   * @param caregiverUserId - The caregiver's user ID
   * @returns Array of access relationships with recipient user details
   */
  async function listCareRecipients(caregiverUserId: UserId): Promise<CaregiverAccessWithUser[]> {
    return repo.listRecipientsForCaregiver(caregiverUserId);
  }

  /**
   * Check if a caregiver has approved access to a recipient.
   *
   * @param caregiverUserId - The caregiver's user ID
   * @param recipientUserId - The recipient's user ID
   * @returns True if caregiver has approved access
   */
  async function hasAccess(caregiverUserId: UserId, recipientUserId: UserId): Promise<boolean> {
    return repo.hasApprovedAccess(caregiverUserId, recipientUserId);
  }

  return {
    requestAccess,
    inviteCaregiver,
    approveRequest,
    acceptInvite,
    revokeAccess,
    cancelAccess,
    listCaregivers,
    listCareRecipients,
    hasAccess,
  };
}

/**
 * Type representing the caregiver access service instance.
 */
export type CaregiverAccessService = ReturnType<typeof createCaregiverAccessService>;
