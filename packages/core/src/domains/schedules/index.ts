/**
 * Schedules domain public API.
 */

// Entity types
export type {
  RecurrenceType,
  MedicationSchedule,
  CreateScheduleInput,
  CreateScheduleForMedicationInput,
  UpdateScheduleInput,
} from './entity.js';

// Validation schemas
export { createScheduleInputSchema, updateScheduleInputSchema } from './schema.js';
export type { CreateScheduleInputSchema, UpdateScheduleInputSchema } from './schema.js';

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
  LastScheduleEndError,
  ScheduleInactiveMedicationError,
  isScheduleNotFound,
  isLastScheduleEnd,
  isScheduleInactiveMedication,
} from './errors.js';
