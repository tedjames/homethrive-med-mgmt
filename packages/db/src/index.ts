/**
 * @homethrive/db - database adapters for @homethrive/core
 */

import { createDb, getDb, resetDb, testConnection, type DbClient } from './connection.ts';
import * as schema from './schema/index.ts';
import {
  careRecipients,
  doseTaken,
  medicationSchedules,
  medications,
  recurrenceTypeEnum,
  users,
  type RecurrenceTypeEnum,
} from './schema/core.ts';
import {
  DrizzleCareRecipientRepository,
  DrizzleDoseTakenRepository,
  DrizzleMedicationRepository,
  DrizzleScheduleRepository,
  DrizzleUserRepository,
  type UpsertUserInput,
} from './repositories/index.ts';

// Connection utilities
export { createDb, getDb, resetDb, testConnection };
export type { DbClient };

// Schema exports
export { schema };
export { recurrenceTypeEnum, careRecipients, medications, medicationSchedules, doseTaken };
export type { RecurrenceTypeEnum };
export { users };

// Repository implementations
export {
  DrizzleCareRecipientRepository,
  DrizzleMedicationRepository,
  DrizzleScheduleRepository,
  DrizzleDoseTakenRepository,
  DrizzleUserRepository,
};
export type { UpsertUserInput };
