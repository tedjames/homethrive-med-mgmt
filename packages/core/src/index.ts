/**
 * @homethrive/core public API.
 */

// Shared
export type { DomainErrorCode, DomainErrorDetails } from './shared/errors.js';
export {
  DomainError,
  ValidationError,
  NotFoundError,
  ConflictError,
  isDomainError,
} from './shared/errors.js';

export {
  DEFAULT_TIMEZONE,
  isValidIanaTimezone,
  isValidLocalDateString,
  isValidTimeOfDayString,
  parseTimeOfDay,
} from './shared/time-utils.js';

export type { ISODateString, ISODateTimeString, UserId } from './shared/types.js';

// Domains
export * from './domains/care-recipients/index.js';
export * from './domains/medications/index.js';
export * from './domains/schedules/index.js';
export * from './domains/doses/index.js';

// Test helpers
export * as mocks from './__mocks__/mock-repositories.js';
