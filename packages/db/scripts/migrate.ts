/**
 * Run database migrations.
 * Usage: tsx scripts/migrate.ts
 */
import { config } from 'dotenv';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

// Load .env file if present
config();

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  // Needed for gen_random_uuid() defaults.
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './migrations' });

  console.log('Migrations complete!');
  await client.end();
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
