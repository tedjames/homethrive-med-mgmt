/**
 * Shared domain error hierarchy.
 */

export type DomainErrorCode = string;
export type DomainErrorDetails = Record<string, unknown>;

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly details: DomainErrorDetails | undefined;

  constructor(message: string, code: DomainErrorCode, details?: DomainErrorDetails) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, code = 'VALIDATION_ERROR', details?: DomainErrorDetails) {
    super(message, code, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, identifier: string) {
    super(`${resource} ${identifier} not found`, 'NOT_FOUND', { resource, identifier });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, code = 'CONFLICT', details?: DomainErrorDetails) {
    super(message, code, details);
    this.name = 'ConflictError';
  }
}

export function isDomainError(err: unknown): err is DomainError {
  return err instanceof DomainError;
}
