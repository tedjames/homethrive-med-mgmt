/**
 * Profile API routes.
 *
 * Endpoints for managing the user's own care recipient profile:
 * - Get my profile
 * - Update my profile (display name, timezone)
 */

import type { FastifyInstance } from 'fastify';

import {
  updateCareRecipientInputSchema,
  isCareRecipientNotFound,
} from '@homethrive/core';

import { resolveUserId } from '../../utils/auth.js';
import { sendSuccess, sendError, HTTP_STATUS } from '../../utils/responses.js';

export default async function profileRoutes(fastify: FastifyInstance): Promise<void> {
  const { careRecipientService } = fastify.container;

  /**
   * Get my profile.
   * GET /profile
   */
  fastify.get('/profile', async (request, reply) => {
    const userId = resolveUserId(request);

    try {
      const profile = await careRecipientService.getMyProfile(userId);
      return sendSuccess(reply, profile);
    } catch (err) {
      if (isCareRecipientNotFound(err)) {
        return sendError(reply, 'Profile not found. Please sign in again.', HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  /**
   * Update my profile.
   * PATCH /profile
   */
  fastify.patch('/profile', async (request, reply) => {
    const userId = resolveUserId(request);

    const parseResult = updateCareRecipientInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendError(reply, parseResult.error.message, HTTP_STATUS.BAD_REQUEST);
    }

    try {
      const profile = await careRecipientService.updateMyProfile(userId, parseResult.data);
      return sendSuccess(reply, profile);
    } catch (err) {
      if (isCareRecipientNotFound(err)) {
        return sendError(reply, 'Profile not found. Please sign in again.', HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });
}
