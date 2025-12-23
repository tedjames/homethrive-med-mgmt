/**
 * Test setup file for Vitest
 *
 * This file runs before each test file.
 * Responsible for cleaning the database between tests.
 */
import { createDb, type DbClient } from '@homethrive/db';
import { sql } from 'drizzle-orm';
import { afterAll, beforeEach } from 'vitest';

// Test database connection (singleton)
let db: DbClient | null = null;

/**
 * Get the test database connection
 */
export function getTestDb(): DbClient {
  if (!db) {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://homethrive_test:test_password@localhost:5433/homethrive_test';
    db = createDb(connectionString);
  }
  return db;
}

/**
 * Clean all tables in the database
 * Uses TRUNCATE with CASCADE to handle foreign key constraints
 */
export async function cleanDatabase(): Promise<void> {
  const testDb = getTestDb();

  // Truncate all tables at once to minimize notices and improve performance
  await testDb.execute(sql.raw(`
    SET client_min_messages TO WARNING;
    TRUNCATE TABLE
      dose_taken,
      medication_schedules,
      medications,
      care_recipients,
      users
    CASCADE;
    SET client_min_messages TO NOTICE;
  `));
}

// Clean database before each test for isolation
beforeEach(async () => {
  await cleanDatabase();
});

// Close connection after all tests
afterAll(() => {
  db = null;
});
