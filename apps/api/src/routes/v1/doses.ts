/**
 * Doses API routes.
 */

import type { FastifyInstance } from 'fastify';

import {
  listDosesQuerySchema,
  isDoseNotFound,
  isInvalidDoseId,
  isInactiveMedication,
} from '@homethrive/core';

import { resolveUserId } from '../../utils/auth.js';
import { sendSuccess, sendError, HTTP_STATUS } from '../../utils/responses.js';

export default async function dosesRoutes(fastify: FastifyInstance): Promise<void> {
  const { doseService } = fastify.container;

  // List upcoming doses for recipient
  fastify.get('/recipients/:recipientId/doses', async (request, reply) => {
    const userId = resolveUserId(request);
    const { recipientId } = request.params as { recipientId: string };
    const query = request.query as Record<string, unknown>;

    const parseResult = listDosesQuerySchema.safeParse(query);
    if (!parseResult.success) {
      return sendError(reply, parseResult.error.message, HTTP_STATUS.BAD_REQUEST);
    }

    const filters = {
      from: parseResult.data.from ? new Date(parseResult.data.from) : undefined,
      to: parseResult.data.to ? new Date(parseResult.data.to) : undefined,
      includeInactive: parseResult.data.includeInactive,
    };

    const doses = await doseService.listUpcomingDoses(userId, recipientId, filters);
    return sendSuccess(reply, doses);
  });

  // Mark dose as taken
  fastify.post('/doses/:doseId/taken', async (request, reply) => {
    const userId = resolveUserId(request);
    const { doseId } = request.params as { doseId: string };

    try {
      const dose = await doseService.markTaken(userId, doseId);
      return sendSuccess(reply, dose);
    } catch (err) {
      if (isDoseNotFound(err)) {
        return sendError(reply, err.message, HTTP_STATUS.NOT_FOUND);
      }
      if (isInvalidDoseId(err)) {
        return sendError(reply, err.message, HTTP_STATUS.BAD_REQUEST, 'INVALID_DOSE_ID');
      }
      if (isInactiveMedication(err)) {
        return sendError(reply, err.message, HTTP_STATUS.CONFLICT, 'MEDICATION_INACTIVE');
      }
      throw err;
    }
  });
}
