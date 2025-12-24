/**
 * Medication domain-specific errors.
 */

import { ConflictError, NotFoundError, ValidationError } from '../../shared/errors.js';

export class MedicationNotFoundError extends NotFoundError {
  constructor(medicationId: string) {
    super('Medication', medicationId);
    this.name = 'MedicationNotFoundError';
  }
}

export class MedicationRequiresScheduleError extends ValidationError {
  constructor() {
    super('Medication must have at least one schedule', 'MEDICATION_REQUIRES_SCHEDULE');
    this.name = 'MedicationRequiresScheduleError';
  }
}

export class InactiveMedicationError extends ConflictError {
  constructor(medicationId: string) {
    super(`Medication ${medicationId} is inactive`, 'INACTIVE_MEDICATION', { medicationId });
    this.name = 'InactiveMedicationError';
  }
}

export function isMedicationNotFound(err: unknown): err is MedicationNotFoundError {
  return err instanceof MedicationNotFoundError;
}

export function isMedicationRequiresSchedule(err: unknown): err is MedicationRequiresScheduleError {
  return err instanceof MedicationRequiresScheduleError;
}

export function isInactiveMedication(err: unknown): err is InactiveMedicationError {
  return err instanceof InactiveMedicationError;
}
