/**
 * Caregiver access domain public API.
 */

// Entity types
export type {
  AccessStatus,
  CaregiverAccess,
  CaregiverAccessWithUser,
  InviteCaregiverInput,
  RequestAccessInput,
} from './entity.js';

// Validation schemas
export {
  inviteCaregiverInputSchema,
  requestAccessInputSchema,
} from './schema.js';
export type { InviteCaregiverInputSchema, RequestAccessInputSchema } from './schema.js';

// Repository interface
export type { CaregiverAccessRepository, UserLookup } from './repository.js';

// Service factory
export { createCaregiverAccessService } from './service.js';
export type { CaregiverAccessService } from './service.js';

// Errors and type guards
export {
  AccessAlreadyExistsError,
  AccessNotAuthorizedError,
  AccessNotFoundError,
  InvalidAccessStateError,
  isAccessAlreadyExists,
  isAccessNotAuthorized,
  isAccessNotFound,
  isInvalidAccessState,
  isSelfAccess,
  isUserNotFoundByEmail,
  SelfAccessError,
  UserNotFoundByEmailError,
} from './errors.js';
