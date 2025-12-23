/**
 * Schedules domain public API.
 */

// Entity types
export type {
  RecurrenceType,
  MedicationSchedule,
  CreateScheduleInput,
  CreateScheduleForMedicationInput,
} from './entity.js';

// Validation schemas
export { createScheduleInputSchema } from './schema.js';
export type { CreateScheduleInputSchema } from './schema.js';

// Repository interface
export type { ScheduleRepository } from './repository.js';

// Service factory
export { createScheduleService } from './service.js';
export type { ScheduleService } from './service.js';

// Errors and type guards
export {
  ScheduleNotFoundError,
  WeeklyScheduleMissingDaysError,
  InvalidRecurrenceRuleError,
  isScheduleNotFound,
} from './errors.js';
