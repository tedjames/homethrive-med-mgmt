/**
 * Zod validation schemas for the Medication domain.
 */

import { z } from 'zod';

export const createMedicationInputSchema = z.object({
  name: z.string().min(1).max(100),
  instructions: z.string().max(500).nullable().optional(),
});

export type CreateMedicationInputSchema = z.infer<typeof createMedicationInputSchema>;

export const updateMedicationInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  instructions: z.string().max(500).nullable().optional(),
});

export type UpdateMedicationInputSchema = z.infer<typeof updateMedicationInputSchema>;
