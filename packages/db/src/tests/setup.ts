import { beforeEach } from 'vitest';

import { getDb } from '../connection.js';
import { careRecipients, doseTaken, medicationSchedules, medications, users } from '../schema/core.js';

const db = getDb();

beforeEach(async () => {
  // Delete in FK order
  await db.delete(doseTaken);
  await db.delete(medicationSchedules);
  await db.delete(medications);
  await db.delete(careRecipients);
  await db.delete(users);
});
