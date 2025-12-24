/**
 * Onboarding API routes.
 *
 * Endpoints for user onboarding:
 * - Get current onboarding status
 * - Complete onboarding with profile data
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { isValidIanaTimezone } from '@homethrive/core';

import { resolveUserId } from '../../utils/auth.js';
import { sendSuccess, sendError, HTTP_STATUS } from '../../utils/responses.js';

const completeOnboardingSchema = z
  .object({
    displayName: z.string().min(1, 'Display name is required').max(100),
    timezone: z.string().refine(isValidIanaTimezone, {
      message: 'Invalid timezone',
    }),
    isRecipient: z.boolean(),
    isCaregiver: z.boolean(),
  })
  .refine((data) => data.isRecipient || data.isCaregiver, {
    message: 'At least one role must be selected',
  });

export default async function onboardingRoutes(fastify: FastifyInstance): Promise<void> {
  const { userRepository, careRecipientRepository } = fastify.container;

  /**
   * Get onboarding status.
   * GET /onboarding/status
   */
  fastify.get('/onboarding/status', async (request, reply) => {
    const userId = resolveUserId(request);

    const user = await userRepository.findByClerkUserId(userId);
    if (!user) {
      return sendError(reply, 'User not found', HTTP_STATUS.NOT_FOUND);
    }

    return sendSuccess(reply, {
      hasCompletedOnboarding: user.hasCompletedOnboarding,
      displayName: user.displayName,
      timezone: user.timezone,
      isRecipient: user.isRecipient,
      isCaregiver: user.isCaregiver,
    });
  });

  /**
   * Complete onboarding.
   * POST /onboarding/complete
   */
  fastify.post('/onboarding/complete', async (request, reply) => {
    const userId = resolveUserId(request);

    const parseResult = completeOnboardingSchema.safeParse(request.body);
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0];
      return sendError(reply, firstError?.message ?? 'Invalid input', HTTP_STATUS.BAD_REQUEST);
    }

    const { displayName, timezone, isRecipient, isCaregiver } = parseResult.data;

    try {
      // Complete onboarding
      const user = await userRepository.completeOnboarding(userId, {
        displayName,
        timezone,
        isRecipient,
        isCaregiver,
      });

      // If user is a recipient, update their care recipient profile
      if (isRecipient) {
        const profile = await careRecipientRepository.findByUserId(userId);
        if (profile) {
          await careRecipientRepository.update(userId, profile.id, {
            displayName,
            timezone,
          });
        }
      }

      return sendSuccess(reply, {
        hasCompletedOnboarding: true,
        displayName: user.displayName,
        timezone: user.timezone,
        isRecipient: user.isRecipient,
        isCaregiver: user.isCaregiver,
      });
    } catch (err) {
      fastify.log.error({ err, userId }, 'Failed to complete onboarding');
      return sendError(reply, 'Failed to complete onboarding', HTTP_STATUS.INTERNAL_ERROR);
    }
  });
}
