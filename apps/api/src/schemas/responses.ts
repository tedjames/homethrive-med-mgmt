/**
 * Zod schemas for API response contract testing.
 */
import { z } from 'zod';

// Base response wrappers
export const apiSuccessSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    meta: z
      .object({
        page: z.number().optional(),
        limit: z.number().optional(),
        total: z.number().optional(),
        hasMore: z.boolean().optional(),
      })
      .optional(),
  });

export const apiErrorSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.unknown().optional(),
});

// Care Recipient response schema
export const careRecipientResponseSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  timezone: z.string(),
  createdByUserId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Medication Schedule response schema
export const scheduleResponseSchema = z.object({
  id: z.string().uuid(),
  medicationId: z.string().uuid(),
  recurrence: z.enum(['daily', 'weekly']),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().nullable(),
  daysOfWeek: z.array(z.number().min(1).max(7)).nullable(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Medication response schema (without embedded schedules)
export const medicationResponseSchema = z.object({
  id: z.string().uuid(),
  recipientId: z.string().uuid(),
  name: z.string(),
  instructions: z.string().nullable(),
  isActive: z.boolean(),
  inactiveAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Medication with schedules (for list endpoint that may include schedules)
export const medicationWithSchedulesResponseSchema = medicationResponseSchema.extend({
  schedules: z.array(scheduleResponseSchema).optional(),
});

// Dose occurrence response schema
export const doseResponseSchema = z.object({
  doseId: z.string(),
  scheduleId: z.string().uuid(),
  medicationId: z.string().uuid(),
  recipientId: z.string().uuid(),
  medicationName: z.string(),
  scheduledFor: z.string(),
  status: z.enum(['scheduled', 'taken']),
  takenAt: z.string().nullable(),
  takenByUserId: z.string().nullable(),
});

// Endpoint-specific response schemas
export const responses = {
  // Recipients
  'POST /v1/recipients': apiSuccessSchema(careRecipientResponseSchema),
  'GET /v1/recipients': apiSuccessSchema(z.array(careRecipientResponseSchema)),
  'GET /v1/recipients/:id': apiSuccessSchema(careRecipientResponseSchema),
  'PATCH /v1/recipients/:id': apiSuccessSchema(careRecipientResponseSchema),

  // Medications
  'POST /v1/recipients/:recipientId/medications': apiSuccessSchema(
    z.object({
      medication: medicationResponseSchema,
      schedules: z.array(scheduleResponseSchema),
    })
  ),
  'GET /v1/recipients/:recipientId/medications': apiSuccessSchema(
    z.array(medicationWithSchedulesResponseSchema)
  ),
  'GET /v1/medications/:id': apiSuccessSchema(medicationWithSchedulesResponseSchema),
  'PATCH /v1/medications/:id': apiSuccessSchema(medicationResponseSchema),
  'POST /v1/medications/:id/deactivate': apiSuccessSchema(medicationResponseSchema),

  // Doses
  'GET /v1/recipients/:recipientId/doses': apiSuccessSchema(z.array(doseResponseSchema)),
  'POST /v1/doses/:doseId/taken': apiSuccessSchema(doseResponseSchema),
};
