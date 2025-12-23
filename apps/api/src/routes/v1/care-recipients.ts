/**
 * Care recipients API routes.
 */

import type { FastifyInstance } from 'fastify';

import {
  createCareRecipientInputSchema,
  updateCareRecipientInputSchema,
  isCareRecipientNotFound,
} from '@homethrive/core';

import { resolveUserId } from '../../utils/auth.js';
import { sendSuccess, sendError, HTTP_STATUS } from '../../utils/responses.js';

export default async function careRecipientsRoutes(fastify: FastifyInstance): Promise<void> {
  const { careRecipientService } = fastify.container;

  // Create care recipient
  fastify.post('/recipients', async (request, reply) => {
    const userId = resolveUserId(request);

    const parseResult = createCareRecipientInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendError(reply, parseResult.error.message, HTTP_STATUS.BAD_REQUEST);
    }

    const recipient = await careRecipientService.create(userId, parseResult.data);
    return sendSuccess(reply, recipient, HTTP_STATUS.CREATED);
  });

  // List care recipients for current user
  fastify.get('/recipients', async (request, reply) => {
    const userId = resolveUserId(request);

    const recipients = await careRecipientService.listForCaregiver(userId);
    return sendSuccess(reply, recipients);
  });

  // Get care recipient by ID
  fastify.get('/recipients/:id', async (request, reply) => {
    const userId = resolveUserId(request);
    const { id } = request.params as { id: string };

    try {
      const recipient = await careRecipientService.getById(userId, id);
      return sendSuccess(reply, recipient);
    } catch (err) {
      if (isCareRecipientNotFound(err)) {
        return sendError(reply, err.message, HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  // Update care recipient
  fastify.patch('/recipients/:id', async (request, reply) => {
    const userId = resolveUserId(request);
    const { id } = request.params as { id: string };

    const parseResult = updateCareRecipientInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendError(reply, parseResult.error.message, HTTP_STATUS.BAD_REQUEST);
    }

    try {
      const recipient = await careRecipientService.update(userId, id, parseResult.data);
      return sendSuccess(reply, recipient);
    } catch (err) {
      if (isCareRecipientNotFound(err)) {
        return sendError(reply, err.message, HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
}
