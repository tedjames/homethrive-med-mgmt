/**
 * Care recipient domain entity types.
 *
 * In the new model, a care recipient IS a user who controls their own profile.
 * The `userId` field links to the user who owns this profile.
 * The deprecated `createdByUserId` is kept for backwards compatibility with existing data.
 */

export interface CareRecipient {
  id: string;
  displayName: string;
  timezone: string;
  /**
   * The user who owns this care recipient profile.
   * In the new model, a care recipient IS a user who controls their own profile.
   * This is nullable during migration but will be required for new profiles.
   */
  userId: string | null;
  /**
   * @deprecated Use userId instead. This was the old model where caregivers created recipients.
   * Kept for backwards compatibility with existing data.
   */
  createdByUserId: string | null;
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
