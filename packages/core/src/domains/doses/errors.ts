/**
 * Dose domain-specific errors.
 */

import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors.js';

export class DoseNotFoundError extends NotFoundError {
  constructor(doseId: string) {
    super('DoseOccurrence', doseId);
    this.name = 'DoseNotFoundError';
  }
}

/**
 * Error indicating a dose was already marked as taken.
 *
 * **Note:** This error is currently UNUSED due to the idempotent design of
 * `markTaken`. When marking a dose that's already taken, the system returns
 * the existing record instead of throwing an error. This class is retained
 * for future use cases where explicit conflict handling may be needed, such as:
 *
 * - Enforcing "only the original marker can modify" semantics
 * - Audit logging that distinguishes new vs. duplicate mark attempts
 * - API responses that explicitly communicate "already taken" status
 *
 * @see DoseTakenRepository.markTaken for the idempotent implementation
 */
export class DoseAlreadyTakenError extends ConflictError {
  constructor(doseId: string, takenAt: Date) {
    super(
      `Dose ${doseId} was already taken at ${takenAt.toISOString()}`,
      'DOSE_ALREADY_TAKEN',
      { doseId, takenAt }
    );
    this.name = 'DoseAlreadyTakenError';
  }
}

export class InvalidDoseIdError extends ValidationError {
  constructor(message: string) {
    super(message, 'INVALID_DOSE_ID');
    this.name = 'InvalidDoseIdError';
  }
}

/**
 * Error thrown when a time window has inverted bounds (from > to).
 */
export class InvalidWindowError extends ValidationError {
  constructor() {
    super('Window start must be before end', 'INVALID_WINDOW');
    this.name = 'InvalidWindowError';
  }
}

export function isDoseNotFound(err: unknown): err is DoseNotFoundError {
  return err instanceof DoseNotFoundError;
}

export function isDoseAlreadyTaken(err: unknown): err is DoseAlreadyTakenError {
  return err instanceof DoseAlreadyTakenError;
}

export function isInvalidDoseId(err: unknown): err is InvalidDoseIdError {
  return err instanceof InvalidDoseIdError;
}

export function isInvalidWindow(err: unknown): err is InvalidWindowError {
  return err instanceof InvalidWindowError;
}
