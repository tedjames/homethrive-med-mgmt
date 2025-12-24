/**
 * Zod validation schemas for the Caregiver Access domain.
 */

import { z } from 'zod';

/**
 * Schema for requesting access to a care recipient by email.
 */
export const requestAccessInputSchema = z.object({
  recipientEmail: z.string().email('Must be a valid email address'),
});

export type RequestAccessInputSchema = z.infer<typeof requestAccessInputSchema>;

/**
 * Schema for inviting a caregiver by email.
 */
export const inviteCaregiverInputSchema = z.object({
  caregiverEmail: z.string().email('Must be a valid email address'),
});

export type InviteCaregiverInputSchema = z.infer<typeof inviteCaregiverInputSchema>;
