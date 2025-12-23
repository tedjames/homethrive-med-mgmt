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
}
