/**
 * Caregiver access domain-specific errors.
 */

import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors.js';

/**
 * Thrown when a user is not found by email.
 */
export class UserNotFoundByEmailError extends NotFoundError {
  constructor(email: string) {
    super('User', email);
    this.name = 'UserNotFoundByEmailError';
  }
}

export function isUserNotFoundByEmail(err: unknown): err is UserNotFoundByEmailError {
  return err instanceof UserNotFoundByEmailError;
}

/**
 * Thrown when an access relationship is not found.
 */
export class AccessNotFoundError extends NotFoundError {
  constructor(accessId: string) {
    super('Access', accessId);
    this.name = 'AccessNotFoundError';
  }
}

export function isAccessNotFound(err: unknown): err is AccessNotFoundError {
  return err instanceof AccessNotFoundError;
}

/**
 * Thrown when an active access relationship already exists.
 */
export class AccessAlreadyExistsError extends ConflictError {
  constructor(caregiverUserId: string, recipientUserId: string) {
    super('An active access relationship already exists between these users', 'ACCESS_ALREADY_EXISTS', {
      caregiverUserId,
      recipientUserId,
    });
    this.name = 'AccessAlreadyExistsError';
  }
}

export function isAccessAlreadyExists(err: unknown): err is AccessAlreadyExistsError {
  return err instanceof AccessAlreadyExistsError;
}

/**
 * Thrown when a user tries to create an access relationship with themselves.
 */
export class SelfAccessError extends ValidationError {
  constructor() {
    super('Cannot create an access relationship with yourself', 'SELF_ACCESS');
    this.name = 'SelfAccessError';
  }
}

export function isSelfAccess(err: unknown): err is SelfAccessError {
  return err instanceof SelfAccessError;
}

/**
 * Thrown when trying to perform an action on an access in an invalid state.
 */
export class InvalidAccessStateError extends ValidationError {
  constructor(accessId: string, currentStatus: string, requiredStatus: string | string[]) {
    const required = Array.isArray(requiredStatus) ? requiredStatus.join(' or ') : requiredStatus;
    super(
      `Access ${accessId} is in state '${currentStatus}', but must be '${required}' for this action`,
      'INVALID_ACCESS_STATE',
      { accessId, currentStatus, requiredStatus }
    );
    this.name = 'InvalidAccessStateError';
  }
}

export function isInvalidAccessState(err: unknown): err is InvalidAccessStateError {
  return err instanceof InvalidAccessStateError;
}

/**
 * Thrown when a user tries to perform an action they're not authorized for.
 */
export class AccessNotAuthorizedError extends ValidationError {
  constructor(accessId: string, action: string) {
    super(`Not authorized to ${action} access ${accessId}`, 'ACCESS_NOT_AUTHORIZED', {
      accessId,
      action,
    });
    this.name = 'AccessNotAuthorizedError';
  }
}

export function isAccessNotAuthorized(err: unknown): err is AccessNotAuthorizedError {
  return err instanceof AccessNotAuthorizedError;
}
