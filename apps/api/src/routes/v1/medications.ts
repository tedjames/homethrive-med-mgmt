/**
 * Medications API routes.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import {
  updateMedicationInputSchema,
  isMedicationNotFound,
  isMedicationRequiresSchedule,
  isInactiveMedication,
  isValidIanaTimezone,
  type CreateScheduleForMedicationInput,
} from '@homethrive/core';

import { resolveUserId } from '../../utils/auth.js';
import { sendSuccess, sendError, HTTP_STATUS } from '../../utils/responses.js';

// Schedule input schema without medicationId (for creating with medication)
const scheduleForMedicationSchema = z
  .object({
    recurrence: z.enum(['daily', 'weekly']),
    timeOfDay: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Must be HH:mm format'),
    timezone: z.string().max(64).refine(isValidIanaTimezone, { message: 'Must be a valid IANA timezone' }).nullable().optional(),
    daysOfWeek: z.array(z.number().int().min(1).max(7)).min(1).nullable().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.recurrence === 'weekly') {
        return Array.isArray(data.daysOfWeek) && data.daysOfWeek.length > 0;
      }
      return true;
    },
    { message: 'Weekly schedules must specify at least one day of week' }
  )
  .refine(
    (data) => {
      if (data.recurrence === 'daily') {
        return data.daysOfWeek == null;
      }
      return true;
    },
    { message: 'Daily schedules must not specify days of week' }
  );

// Schema for creating medication with schedules
const createMedicationWithSchedulesSchema = z.object({
  name: z.string().min(1),
  instructions: z.string().nullable().optional(),
  schedules: z.array(scheduleForMedicationSchema).min(1, 'At least one schedule is required'),
});

export default async function medicationsRoutes(fastify: FastifyInstance): Promise<void> {
  const { medicationService, scheduleService } = fastify.container;

  // Create medication with schedules
  fastify.post('/recipients/:recipientId/medications', async (request, reply) => {
    const userId = resolveUserId(request);
    const { recipientId } = request.params as { recipientId: string };

    const parseResult = createMedicationWithSchedulesSchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendError(reply, parseResult.error.message, HTTP_STATUS.BAD_REQUEST);
    }

    const { name, instructions, schedules } = parseResult.data;

    try {
      const medication = await medicationService.create(
        userId,
        recipientId,
        { name, instructions: instructions ?? null },
        schedules as CreateScheduleForMedicationInput[]
      );

      // Fetch schedules for the response
      const medicationSchedules = await scheduleService.listByMedication(userId, medication.id);

      return sendSuccess(reply, { medication, schedules: medicationSchedules }, HTTP_STATUS.CREATED);
    } catch (err) {
      if (isMedicationRequiresSchedule(err)) {
        return sendError(reply, err.message, HTTP_STATUS.BAD_REQUEST, 'MEDICATION_REQUIRES_SCHEDULE');
      }
      throw err;
    }
  });

  // List medications for recipient
  fastify.get('/recipients/:recipientId/medications', async (request, reply) => {
    const userId = resolveUserId(request);
    const { recipientId } = request.params as { recipientId: string };
    const query = request.query as { includeInactive?: string };

    const includeInactive = query.includeInactive === 'true';
    const medications = await medicationService.listByRecipient(userId, recipientId, includeInactive);

    return sendSuccess(reply, medications);
  });

  // Get medication by ID
  fastify.get('/medications/:id', async (request, reply) => {
    const userId = resolveUserId(request);
    const { id } = request.params as { id: string };

    try {
      const medication = await medicationService.getById(userId, id);
      return sendSuccess(reply, medication);
    } catch (err) {
      if (isMedicationNotFound(err)) {
        return sendError(reply, err.message, HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  // Update medication
  fastify.patch('/medications/:id', async (request, reply) => {
    const userId = resolveUserId(request);
    const { id } = request.params as { id: string };

    const parseResult = updateMedicationInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendError(reply, parseResult.error.message, HTTP_STATUS.BAD_REQUEST);
    }

    try {
      const medication = await medicationService.update(userId, id, parseResult.data);
      return sendSuccess(reply, medication);
    } catch (err) {
      if (isMedicationNotFound(err)) {
        return sendError(reply, err.message, HTTP_STATUS.NOT_FOUND);
      }
      if (isInactiveMedication(err)) {
        return sendError(reply, err.message, HTTP_STATUS.CONFLICT, 'MEDICATION_INACTIVE');
      }
      throw err;
    }
  });

  // Deactivate medication (soft delete)
  fastify.post('/medications/:id/deactivate', async (request, reply) => {
    const userId = resolveUserId(request);
    const { id } = request.params as { id: string };

    try {
      const medication = await medicationService.setInactive(userId, id);
      return sendSuccess(reply, medication);
    } catch (err) {
      if (isMedicationNotFound(err)) {
        return sendError(reply, err.message, HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
}
