import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

export default async function globalSetup() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required for DB tests');
  }

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  // Needed for gen_random_uuid() defaults.
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

  await migrate(db, { migrationsFolder: './migrations' });

  await client.end();
}
