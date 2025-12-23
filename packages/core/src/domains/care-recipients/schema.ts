/**
 * Zod validation schemas for the Care Recipient domain.
 */

import { z } from 'zod';

import { DEFAULT_TIMEZONE, isValidIanaTimezone } from '../../shared/time-utils.js';

const timezoneSchema = z
  .string()
  .max(64)
  .refine(isValidIanaTimezone, { message: 'Must be a valid IANA timezone' });

export const createCareRecipientInputSchema = z.object({
  displayName: z.string().min(1).max(100),
  timezone: timezoneSchema.default(DEFAULT_TIMEZONE),
});

export type CreateCareRecipientInputSchema = z.infer<typeof createCareRecipientInputSchema>;

export const updateCareRecipientInputSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  timezone: timezoneSchema.optional(),
});

export type UpdateCareRecipientInputSchema = z.infer<typeof updateCareRecipientInputSchema>;
