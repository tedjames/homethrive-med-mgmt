/**
 * Care recipient repository interface (port).
 */

import type { UserId } from '../../shared/types.js';
import type {
  CareRecipient,
  CreateCareRecipientInput,
  UpdateCareRecipientInput,
} from './entity.js';

export interface CareRecipientRepository {
  findById(userId: UserId, recipientId: string): Promise<CareRecipient | null>;
  listForCaregiver(userId: UserId): Promise<CareRecipient[]>;
  create(userId: UserId, input: CreateCareRecipientInput): Promise<CareRecipient>;
  update(userId: UserId, recipientId: string, input: UpdateCareRecipientInput): Promise<CareRecipient | null>;

  /**
   * Finds the user's own care recipient profile.
   * Returns null if the user doesn't have a profile yet.
   */
  findByUserId(userId: UserId): Promise<CareRecipient | null>;

  /**
   * Finds or creates the user's own care recipient profile.
   * Used during authentication to ensure every user has a profile.
   */
  findOrCreateOwnProfile(userId: UserId, displayName: string): Promise<CareRecipient>;
}
