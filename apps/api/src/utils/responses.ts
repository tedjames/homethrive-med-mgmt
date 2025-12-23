/**
 * Standardized API response utilities.
 */

import type { FastifyReply } from 'fastify';

export type ApiMeta = {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
};

export type ApiSuccess<T = unknown> = {
  data: T;
  meta?: ApiMeta;
};

export type ApiError = {
  error: string;
  code?: string;
  details?: unknown;
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_ERROR: 500,
  NOT_IMPLEMENTED: 501,
} as const;

export function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  status: number = HTTP_STATUS.OK,
  meta?: ApiMeta
): FastifyReply {
  const body: ApiSuccess<T> = meta ? { data, meta } : { data };
  return reply.code(status).send(body);
}

export function sendError(
  reply: FastifyReply,
  message: string,
  status: number = HTTP_STATUS.BAD_REQUEST,
  code?: string,
  details?: unknown
): FastifyReply {
  const body: ApiError = { error: message };
  if (code) {
    body.code = code;
  }
  if (details !== undefined) {
    body.details = details;
  }
  return reply.code(status).send(body);
}
