/**
 * Global error handler plugin.
 * Maps domain errors to HTTP responses.
 */

import type { FastifyInstance, FastifyError } from 'fastify';
import fp from 'fastify-plugin';

import {
  isDomainError,
  NotFoundError,
  ValidationError,
  ConflictError,
} from '@homethrive/core';

import { sendError, HTTP_STATUS } from '../utils/responses.js';

// Extended error interface for errors with additional properties
interface ExtendedFastifyError extends FastifyError {
  details?: unknown;
}

function getStatusForDomainError(error: unknown): number {
  if (error instanceof NotFoundError) {
    return HTTP_STATUS.NOT_FOUND;
  }
  if (error instanceof ValidationError) {
    return HTTP_STATUS.BAD_REQUEST;
  }
  if (error instanceof ConflictError) {
    return HTTP_STATUS.CONFLICT;
  }
  return HTTP_STATUS.INTERNAL_ERROR;
}

const errorsPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.setErrorHandler((error: FastifyError, _request, reply) => {
    // Handle domain errors from core package
    if (isDomainError(error)) {
      const status = getStatusForDomainError(error);
      return sendError(
        reply,
        error.message,
        status,
        error.code,
        error.details
      );
    }

    // Handle Fastify HTTP errors (from httpErrors helper)
    const extError = error as ExtendedFastifyError;
    const status = error.statusCode ?? HTTP_STATUS.INTERNAL_ERROR;
    const code = error.code;
    const details = extError.details;

    // Log server errors
    if (status >= HTTP_STATUS.INTERNAL_ERROR) {
      fastify.log.error({ err: error }, 'Unhandled error in API layer');
    }

    return sendError(
      reply,
      error.message || 'Unexpected error',
      status,
      code,
      details
    );
  });
});

export default errorsPlugin;
