/**
 * Authentication utilities for route handlers.
 */

import type { FastifyRequest } from 'fastify';

/**
 * Get the authenticated user ID from the request.
 * Throws 401 Unauthorized if no user is authenticated.
 */
export function resolveUserId(request: FastifyRequest): string {
  const userId = request.userId;
  if (!userId) {
    throw request.server.httpErrors.unauthorized('Authentication required');
  }
  return userId;
}
