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
