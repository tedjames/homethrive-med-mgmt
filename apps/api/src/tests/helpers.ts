/**
 * Test helpers for API integration tests
 */
import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';

import { buildApp, type BuildAppOptions } from '../app.js';
import { getConfig } from '../config.js';

import { getTestDb } from './setup.js';

/**
 * Build a test app instance configured for testing
 * Uses test database connection and disables features not needed for tests
 */
export async function buildTestApp(): Promise<FastifyInstance> {
  // Initialize config (required before buildApp)
  await getConfig();

  // Ensure test database connection is initialized
  getTestDb();

  // Get the test database URL
  const databaseUrl =
    process.env.DATABASE_URL ||
    'postgresql://homethrive_test:test_password@localhost:5433/homethrive_test';

  const buildOptions: BuildAppOptions = {
    logger: false, // Disable logging in tests for cleaner output
    databaseUrl,
  };

  const app = buildApp(buildOptions);

  // Wait for app to be ready
  await app.ready();

  return app;
}

/**
 * Generate an auth header for a test user
 * Uses mock auth (since ENABLE_CLERK=false in test env)
 */
export function authHeader(userId: string): { Authorization: string } {
  return { Authorization: `Bearer ${userId}` };
}

/**
 * Generate a unique user ID for test isolation.
 * Creates the user in the database since tables have FK to users.
 * Returns the clerk_user_id of the created user.
 */
export async function generateTestUserId(): Promise<string> {
  // Use a Clerk-style ID format for test users
  const userId = `user_test_${crypto.randomUUID().replace(/-/g, '')}`;
  const db = getTestDb();

  // Create user in database (minimal fields required)
  await db.execute(sql`
    INSERT INTO users (clerk_user_id, email)
    VALUES (${userId}, ${`test-${userId}@example.com`})
  `);

  return userId;
}

/**
 * Close the test app after tests
 */
export async function closeTestApp(app: FastifyInstance): Promise<void> {
  await app.close();
}
