/**
 * @homethrive/db - database adapters for @homethrive/core
 */

import { createDb, getDb, resetDb, testConnection, type DbClient } from './connection.ts';
import * as schema from './schema/index.ts';
import {
  accessStatusEnum,
  caregiverAccess,
  careRecipients,
  doseTaken,
  medicationSchedules,
  medications,
  recurrenceTypeEnum,
  users,
  type AccessStatusEnum,
  type RecurrenceTypeEnum,
} from './schema/core.ts';
import {
  DrizzleCaregiverAccessRepository,
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
export { accessStatusEnum, recurrenceTypeEnum, caregiverAccess, careRecipients, medications, medicationSchedules, doseTaken };
export type { AccessStatusEnum, RecurrenceTypeEnum };
export { users };

// Repository implementations
export {
  DrizzleCaregiverAccessRepository,
  DrizzleCareRecipientRepository,
  DrizzleMedicationRepository,
  DrizzleScheduleRepository,
  DrizzleDoseTakenRepository,
  DrizzleUserRepository,
};
export type { UpsertUserInput };
