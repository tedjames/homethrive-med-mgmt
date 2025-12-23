/**
 * Doses domain public API.
 */

// Entity types
export type { DoseOccurrence, DoseKey, ListDosesFilters } from './dose-occurrence.entity.js';
export type { DoseTaken, MarkDoseTakenInput } from './dose-taken.entity.js';

// Dose ID helpers
export { encodeDoseId, decodeDoseId } from './dose-id.js';

// Recurrence generator
export { generateOccurrences } from './recurrence.js';

// Validation schemas
export { listDosesQuerySchema, markDoseTakenInputSchema } from './schema.js';
export type { ListDosesQuerySchema, MarkDoseTakenInputSchema } from './schema.js';

// Repository interface
export type { DoseTakenRepository } from './repository.js';

// Service factory
export { createDoseService } from './service.js';
export type { DoseService } from './service.js';

// Errors and type guards
export {
  DoseNotFoundError,
  DoseAlreadyTakenError,
  InvalidDoseIdError,
  InvalidWindowError,
  isDoseNotFound,
  isDoseAlreadyTaken,
  isInvalidDoseId,
  isInvalidWindow,
} from './errors.js';
