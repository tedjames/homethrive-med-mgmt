/**
 * Zod validation schemas for the Dose domain.
 */

import { z } from 'zod';

export const listDosesQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  includeInactive: z.coerce.boolean().default(false),
});

export type ListDosesQuerySchema = z.infer<typeof listDosesQuerySchema>;

export const markDoseTakenInputSchema = z.object({
  doseId: z.string().min(1),
});

export type MarkDoseTakenInputSchema = z.infer<typeof markDoseTakenInputSchema>;
