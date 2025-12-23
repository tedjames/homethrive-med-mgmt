/**
 * Care recipient domain service.
 *
 * Provides business logic for managing care recipients - individuals who receive
 * medication care from caregivers. Each care recipient belongs to a single caregiver
 * (identified by userId) and has their own timezone for schedule calculations.
 *
 * @module care-recipients/service
 */

import type { UserId } from '../../shared/types.js';
import type {
  CareRecipient,
  CreateCareRecipientInput,
  UpdateCareRecipientInput,
} from './entity.js';
import { CareRecipientNotFoundError } from './errors.js';
import type { CareRecipientRepository } from './repository.js';

/**
 * Creates a care recipient service instance with the provided repository.
 *
 * Uses functional factory pattern for dependency injection, enabling easy testing
 * with mock repositories.
 *
 * @param repo - The care recipient repository implementation
 * @returns Service object with care recipient management methods
 *
 * @example
 * ```typescript
 * const repo = new DrizzleCareRecipientRepository(db);
 * const service = createCareRecipientService(repo);
 *
 * const recipient = await service.create(userId, {
 *   displayName: 'Mom',
 *   timezone: 'America/New_York',
 * });
 * ```
 */
export function createCareRecipientService(repo: CareRecipientRepository) {
  /**
   * Creates a new care recipient for the given caregiver.
   *
   * @param userId - The caregiver's user ID (becomes createdByUserId)
   * @param input - Care recipient details (displayName, optional timezone)
   * @returns The newly created care recipient
   *
   * @example
   * ```typescript
   * const recipient = await service.create('user-123', {
   *   displayName: 'Grandma',
   *   timezone: 'America/Chicago',
   * });
   * ```
   */
  async function create(
    userId: UserId,
    input: CreateCareRecipientInput
  ): Promise<CareRecipient> {
    return repo.create(userId, input);
  }

  /**
   * Retrieves a care recipient by ID.
   *
   * @param userId - The requesting user's ID (for authorization)
   * @param recipientId - The care recipient's unique identifier
   * @returns The care recipient if found
   * @throws {CareRecipientNotFoundError} If the recipient doesn't exist or user lacks access
   *
   * @example
   * ```typescript
   * const recipient = await service.getById('user-123', 'recipient-456');
   * console.log(recipient.displayName); // "Mom"
   * ```
   */
  async function getById(userId: UserId, recipientId: string): Promise<CareRecipient> {
    const recipient = await repo.findById(userId, recipientId);
    if (!recipient) {
      throw new CareRecipientNotFoundError(recipientId);
    }
    return recipient;
  }

  /**
   * Lists all care recipients belonging to a caregiver.
   *
   * @param userId - The caregiver's user ID
   * @returns Array of care recipients (may be empty)
   *
   * @example
   * ```typescript
   * const recipients = await service.listForCaregiver('user-123');
   * // Returns all recipients created by this user
   * ```
   */
  async function listForCaregiver(userId: UserId): Promise<CareRecipient[]> {
    return repo.listForCaregiver(userId);
  }

  /**
   * Updates an existing care recipient.
   *
   * @param userId - The requesting user's ID (for authorization)
   * @param recipientId - The care recipient's unique identifier
   * @param input - Fields to update (displayName, timezone)
   * @returns The updated care recipient
   * @throws {CareRecipientNotFoundError} If the recipient doesn't exist or user lacks access
   *
   * @example
   * ```typescript
   * const updated = await service.update('user-123', 'recipient-456', {
   *   displayName: 'Mother',
   *   timezone: 'America/Los_Angeles',
   * });
   * ```
   */
  async function update(
    userId: UserId,
    recipientId: string,
    input: UpdateCareRecipientInput
  ): Promise<CareRecipient> {
    const recipient = await repo.update(userId, recipientId, input);
    if (!recipient) {
      throw new CareRecipientNotFoundError(recipientId);
    }
    return recipient;
  }

  return { create, getById, listForCaregiver, update };
}

/**
 * Type representing the care recipient service instance.
 * Useful for typing service parameters in other modules.
 */
export type CareRecipientService = ReturnType<typeof createCareRecipientService>;
