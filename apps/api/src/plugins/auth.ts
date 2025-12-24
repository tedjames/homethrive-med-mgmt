/**
 * Authentication plugin with dual-mode support:
 * - Production: Clerk JWT authentication
 * - Development/Test: Bearer token mock authentication
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

import { getConfigSync } from '../config.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string | null;
    clerkUserId: string | null;
  }

  interface FastifyInstance {
    requireUser: (request: FastifyRequest) => string;
  }
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const authPlugin = fp(async (fastify: FastifyInstance) => {
  // Use sync version - config must be initialized before plugin registration
  const config = getConfigSync();

  // Decorate request with auth properties
  fastify.decorateRequest('userId', null);
  fastify.decorateRequest('clerkUserId', null);

  // Helper to require authenticated user
  fastify.decorate('requireUser', (request: FastifyRequest) => {
    const id = request.userId;
    if (!id) {
      const error = fastify.httpErrors?.unauthorized?.('Authentication required');
      if (error) throw error;
      throw new Error('Authentication required');
    }
    return id;
  });

  let clerkEnabled = false;

  // Register Clerk plugin in production mode
  if (config.enableClerk) {
    try {
      // Dynamic import to avoid requiring Clerk in dev/test
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = await import('@clerk/fastify') as any;
      const clerkPlugin = mod.clerkPlugin ?? mod.default;
      if (clerkPlugin) {
        await fastify.register(clerkPlugin, {
          publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
          secretKey: config.clerkSecretKey,
        });
        clerkEnabled = true;
        fastify.log.info('Clerk Fastify plugin registered');
      }
    } catch (error) {
      fastify.log.warn(
        { err: error },
        'Clerk Fastify plugin not available; falling back to header-based mock auth'
      );
    }
  }

  fastify.addHook('preHandler', async (request) => {
    const { userRepository, careRecipientRepository } = fastify.container;

    if (clerkEnabled) {
      // Production mode: Only accept Clerk-authenticated requests
      const auth = (request as FastifyRequest & { auth?: { userId?: string } }).auth;
      const clerkUserId = auth?.userId ?? null;

      if (!clerkUserId) {
        request.userId = null;
        request.clerkUserId = null;
        return;
      }

      request.clerkUserId = clerkUserId;

      // Look up or create database user from Clerk ID
      try {
        const user = await userRepository.upsert({ clerkUserId });
        request.userId = user.clerkUserId; // Use clerkUserId as the userId for domain services

        // Auto-create care recipient profile if it doesn't exist
        // Use display name from user record, fallback to email or "My Profile"
        const displayName = user.displayName || user.email?.split('@')[0] || 'My Profile';
        await careRecipientRepository.findOrCreateOwnProfile(user.clerkUserId, displayName);
      } catch (err) {
        fastify.log.error({ err, clerkUserId }, 'Failed to resolve user from Clerk ID');
        request.userId = null;
      }

      return;
    }

    // Development/Test mode: Accept Authorization header as user identifier
    const header = request.headers.authorization;
    const [scheme, tokenValue] = header?.split(' ') ?? [];
    const token = scheme?.toLowerCase() === 'bearer' ? tokenValue : header;

    if (!token) {
      request.userId = null;
      request.clerkUserId = null;
      return;
    }

    // If the token looks like a UUID, treat it as a direct user ID (for tests)
    if (UUID_REGEX.test(token)) {
      request.userId = token;
      request.clerkUserId = null;
      return;
    }

    // Otherwise, treat as a Clerk ID and upsert
    const clerkUserId = token;
    request.clerkUserId = clerkUserId;

    try {
      const user = await userRepository.upsert({ clerkUserId });
      request.userId = user.clerkUserId;

      // Auto-create care recipient profile if it doesn't exist
      const displayName = user.displayName || user.email?.split('@')[0] || 'My Profile';
      await careRecipientRepository.findOrCreateOwnProfile(user.clerkUserId, displayName);
    } catch (err) {
      fastify.log.error({ err, clerkUserId }, 'Failed to resolve user from Clerk ID');
      request.userId = null;
    }
  });
});

export default authPlugin;
