/**
 * Database connection utilities for @homethrive/db
 */
import { sql } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema/index.js';

export type DbClient = PostgresJsDatabase<typeof schema>;

function getDefaultConnectionString(): string {
  if (process.env.NODE_ENV === 'test') {
    return (
      process.env.DATABASE_URL_TEST ??
      process.env.DATABASE_URL ??
      'postgresql://homethrive_test:test_password@localhost:5433/homethrive_test'
    );
  }

  return (
    process.env.DATABASE_URL ??
    'postgresql://homethrive:dev_password@localhost:5432/homethrive_dev'
  );
}

/**
 * Create a new database client.
 */
export function createDb(connectionString: string): DbClient {
  const client = postgres(connectionString, {
    // Use prepare: false for connection pooling compatibility (Lambda + RDS Proxy)
    prepare: false,
  });

  return drizzle(client, { schema });
}

let _db: DbClient | null = null;
let _connectionString: string | null = null;

/**
 * Get a singleton database client.
 */
export function getDb(): DbClient {
  const connectionString = getDefaultConnectionString();

  if (_db && _connectionString !== connectionString) {
    _db = null;
    _connectionString = null;
  }

  if (!_db) {
    _db = createDb(connectionString);
    _connectionString = connectionString;
  }

  return _db;
}

export function resetDb(): void {
  _db = null;
  _connectionString = null;
}

/**
 * Basic health check query.
 */
export async function testConnection(db: DbClient = getDb()): Promise<void> {
  await db.execute(sql`select 1 as ok`);
}

export { schema };
