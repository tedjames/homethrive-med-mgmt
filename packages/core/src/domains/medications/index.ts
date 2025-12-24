/**
 * Medications domain public API.
 */

// Entity types
export type { Medication, CreateMedicationInput, UpdateMedicationInput } from './entity.js';

// Validation schemas
export { createMedicationInputSchema, updateMedicationInputSchema } from './schema.js';
export type { CreateMedicationInputSchema, UpdateMedicationInputSchema } from './schema.js';

// Repository interface
export type { MedicationRepository } from './repository.js';

// Service factory
export { createMedicationService } from './service.js';
export type { MedicationService } from './service.js';

// Errors and type guards
export {
  MedicationNotFoundError,
  MedicationRequiresScheduleError,
  InactiveMedicationError,
  isMedicationNotFound,
  isMedicationRequiresSchedule,
  isInactiveMedication,
} from './errors.js';
