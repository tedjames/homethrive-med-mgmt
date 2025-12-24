/**
 * Schedule domain-specific errors.
 */

import { NotFoundError, ValidationError } from '../../shared/errors.js';

export class ScheduleNotFoundError extends NotFoundError {
  constructor(scheduleId: string) {
    super('MedicationSchedule', scheduleId);
    this.name = 'ScheduleNotFoundError';
  }
}

export class WeeklyScheduleMissingDaysError extends ValidationError {
  constructor() {
    super(
      'Weekly schedule must specify at least one day of week',
      'WEEKLY_SCHEDULE_MISSING_DAYS'
    );
    this.name = 'WeeklyScheduleMissingDaysError';
  }
}

export class InvalidRecurrenceRuleError extends ValidationError {
  constructor(message: string) {
    super(message, 'INVALID_RECURRENCE_RULE');
    this.name = 'InvalidRecurrenceRuleError';
  }
}

export function isScheduleNotFound(err: unknown): err is ScheduleNotFoundError {
  return err instanceof ScheduleNotFoundError;
}

/**
 * Thrown when attempting to end the last active schedule for a medication.
 * A medication must have at least one active schedule.
 */
export class LastScheduleEndError extends ValidationError {
  constructor(medicationId: string) {
    super(
      `Cannot end the last active schedule for medication ${medicationId}. A medication must have at least one active schedule.`,
      'LAST_SCHEDULE_END'
    );
    this.name = 'LastScheduleEndError';
  }
}

/**
 * Thrown when attempting to modify a schedule for an inactive medication.
 */
export class ScheduleInactiveMedicationError extends ValidationError {
  constructor(scheduleId: string) {
    super(
      `Cannot modify schedule ${scheduleId} because its medication is inactive. Reactivate the medication first.`,
      'SCHEDULE_INACTIVE_MEDICATION'
    );
    this.name = 'ScheduleInactiveMedicationError';
  }
}

export function isLastScheduleEnd(err: unknown): err is LastScheduleEndError {
  return err instanceof LastScheduleEndError;
}

export function isScheduleInactiveMedication(err: unknown): err is ScheduleInactiveMedicationError {
  return err instanceof ScheduleInactiveMedicationError;
}
