/**
 * Care recipient domain entity types.
 */

export interface CareRecipient {
  id: string;
  displayName: string;
  timezone: string;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCareRecipientInput {
  displayName: string;
  timezone?: string;
}

export interface UpdateCareRecipientInput {
  displayName?: string;
  timezone?: string;
}
