/**
 * Schedules API routes.
 */

import type { FastifyInstance } from 'fastify';

import { resolveUserId } from '../../utils/auth.js';
import { sendSuccess } from '../../utils/responses.js';

export default async function schedulesRoutes(fastify: FastifyInstance): Promise<void> {
  const { scheduleService } = fastify.container;

  // List schedules for medication
  fastify.get('/medications/:medicationId/schedules', async (request, reply) => {
    const userId = resolveUserId(request);
    const { medicationId } = request.params as { medicationId: string };

    const schedules = await scheduleService.listByMedication(userId, medicationId);
    return sendSuccess(reply, schedules);
  });

  // List schedules for recipient
  fastify.get('/recipients/:recipientId/schedules', async (request, reply) => {
    const userId = resolveUserId(request);
    const { recipientId } = request.params as { recipientId: string };

    const schedules = await scheduleService.listByRecipient(userId, recipientId);
    return sendSuccess(reply, schedules);
  });
}
