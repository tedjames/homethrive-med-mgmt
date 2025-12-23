/**
 * Care recipients domain public API.
 */

// Entity types
export type {
  CareRecipient,
  CreateCareRecipientInput,
  UpdateCareRecipientInput,
} from './entity.js';

// Validation schemas
export {
  createCareRecipientInputSchema,
  updateCareRecipientInputSchema,
} from './schema.js';
export type { CreateCareRecipientInputSchema, UpdateCareRecipientInputSchema } from './schema.js';

// Repository interface
export type { CareRecipientRepository } from './repository.js';

// Service factory
export { createCareRecipientService } from './service.js';
export type { CareRecipientService } from './service.js';

// Errors and type guards
export {
  CareRecipientNotFoundError,
  isCareRecipientNotFound,
} from './errors.js';
