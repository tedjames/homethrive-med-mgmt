/**
 * Caregiver access API routes.
 *
 * Endpoints for managing caregiver access relationships:
 * - Request access to a care recipient
 * - Invite a caregiver
 * - Approve/deny requests
 * - Accept/decline invites
 * - Revoke access
 * - List caregivers and care recipients
 */

import type { FastifyInstance } from 'fastify';

import {
  requestAccessInputSchema,
  inviteCaregiverInputSchema,
  isUserNotFoundByEmail,
  isSelfAccess,
  isAccessAlreadyExists,
  isAccessNotFound,
  isAccessNotAuthorized,
  isInvalidAccessState,
} from '@homethrive/core';

import { resolveUserId } from '../../utils/auth.js';
import { sendSuccess, sendError, HTTP_STATUS } from '../../utils/responses.js';

export default async function accessRoutes(fastify: FastifyInstance): Promise<void> {
  const { caregiverAccessService } = fastify.container;

  /**
   * Request access to a care recipient by email.
   * POST /access/request
   */
  fastify.post('/access/request', async (request, reply) => {
    const userId = resolveUserId(request);

    const parseResult = requestAccessInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendError(reply, parseResult.error.message, HTTP_STATUS.BAD_REQUEST);
    }

    try {
      const access = await caregiverAccessService.requestAccess(userId, parseResult.data);
      return sendSuccess(reply, access, HTTP_STATUS.CREATED);
    } catch (err) {
      if (isUserNotFoundByEmail(err)) {
        return sendError(reply, 'User not found. Ask them to create an account first.', HTTP_STATUS.NOT_FOUND);
      }
      if (isSelfAccess(err)) {
        return sendError(reply, err.message, HTTP_STATUS.BAD_REQUEST);
      }
      if (isAccessAlreadyExists(err)) {
        return sendError(reply, err.message, HTTP_STATUS.CONFLICT);
      }
      throw err;
    }
  });

  /**
   * Invite a caregiver by email.
   * POST /access/invite
   */
  fastify.post('/access/invite', async (request, reply) => {
    const userId = resolveUserId(request);

    const parseResult = inviteCaregiverInputSchema.safeParse(request.body);
    if (!parseResult.success) {
      return sendError(reply, parseResult.error.message, HTTP_STATUS.BAD_REQUEST);
    }

    try {
      const access = await caregiverAccessService.inviteCaregiver(userId, parseResult.data);
      return sendSuccess(reply, access, HTTP_STATUS.CREATED);
    } catch (err) {
      if (isUserNotFoundByEmail(err)) {
        return sendError(reply, 'User not found. Ask them to create an account first.', HTTP_STATUS.NOT_FOUND);
      }
      if (isSelfAccess(err)) {
        return sendError(reply, err.message, HTTP_STATUS.BAD_REQUEST);
      }
      if (isAccessAlreadyExists(err)) {
        return sendError(reply, err.message, HTTP_STATUS.CONFLICT);
      }
      throw err;
    }
  });

  /**
   * List my caregivers (people who have access to my profile).
   * GET /access/caregivers
   */
  fastify.get('/access/caregivers', async (request, reply) => {
    const userId = resolveUserId(request);
    const caregivers = await caregiverAccessService.listCaregivers(userId);
    return sendSuccess(reply, caregivers);
  });

  /**
   * List care recipients I have access to (people I'm caregiver for).
   * GET /access/recipients
   */
  fastify.get('/access/recipients', async (request, reply) => {
    const userId = resolveUserId(request);
    const recipients = await caregiverAccessService.listCareRecipients(userId);
    return sendSuccess(reply, recipients);
  });

  /**
   * Approve a pending access request (recipient approves caregiver).
   * POST /access/:id/approve
   */
  fastify.post('/access/:id/approve', async (request, reply) => {
    const userId = resolveUserId(request);
    const { id } = request.params as { id: string };

    try {
      const access = await caregiverAccessService.approveRequest(userId, id);
      return sendSuccess(reply, access);
    } catch (err) {
      if (isAccessNotFound(err)) {
        return sendError(reply, err.message, HTTP_STATUS.NOT_FOUND);
      }
      if (isAccessNotAuthorized(err)) {
        return sendError(reply, err.message, HTTP_STATUS.FORBIDDEN);
      }
      if (isInvalidAccessState(err)) {
        return sendError(reply, err.message, HTTP_STATUS.BAD_REQUEST);
      }
      throw err;
    }
  });

  /**
   * Accept a pending invite (caregiver accepts recipient's invite).
   * POST /access/:id/accept
   */
  fastify.post('/access/:id/accept', async (request, reply) => {
    const userId = resolveUserId(request);
    const { id } = request.params as { id: string };

    try {
      const access = await caregiverAccessService.acceptInvite(userId, id);
      return sendSuccess(reply, access);
    } catch (err) {
      if (isAccessNotFound(err)) {
        return sendError(reply, err.message, HTTP_STATUS.NOT_FOUND);
      }
      if (isAccessNotAuthorized(err)) {
        return sendError(reply, err.message, HTTP_STATUS.FORBIDDEN);
      }
      if (isInvalidAccessState(err)) {
        return sendError(reply, err.message, HTTP_STATUS.BAD_REQUEST);
      }
      throw err;
    }
  });

  /**
   * Revoke access (recipient revokes caregiver's access or denies a request).
   * POST /access/:id/revoke
   */
  fastify.post('/access/:id/revoke', async (request, reply) => {
    const userId = resolveUserId(request);
    const { id } = request.params as { id: string };

    try {
      const access = await caregiverAccessService.revokeAccess(userId, id);
      return sendSuccess(reply, access);
    } catch (err) {
      if (isAccessNotFound(err)) {
        return sendError(reply, err.message, HTTP_STATUS.NOT_FOUND);
      }
      if (isAccessNotAuthorized(err)) {
        return sendError(reply, err.message, HTTP_STATUS.FORBIDDEN);
      }
      if (isInvalidAccessState(err)) {
        return sendError(reply, err.message, HTTP_STATUS.BAD_REQUEST);
      }
      throw err;
    }
  });

  /**
   * Cancel access (caregiver cancels their request or declines an invite).
   * POST /access/:id/cancel
   */
  fastify.post('/access/:id/cancel', async (request, reply) => {
    const userId = resolveUserId(request);
    const { id } = request.params as { id: string };

    try {
      const access = await caregiverAccessService.cancelAccess(userId, id);
      return sendSuccess(reply, access);
    } catch (err) {
      if (isAccessNotFound(err)) {
        return sendError(reply, err.message, HTTP_STATUS.NOT_FOUND);
      }
      if (isAccessNotAuthorized(err)) {
        return sendError(reply, err.message, HTTP_STATUS.FORBIDDEN);
      }
      if (isInvalidAccessState(err)) {
        return sendError(reply, err.message, HTTP_STATUS.BAD_REQUEST);
      }
      throw err;
    }
  });
}
