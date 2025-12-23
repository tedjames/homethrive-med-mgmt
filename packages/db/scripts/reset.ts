/**
 * Reset database by dropping and recreating all tables.
 * Usage: tsx scripts/reset.ts
 *
 * WARNING: This will delete all data!
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';

async function resetDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  console.log('Dropping all tables...');
  await db.execute(sql`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);

  console.log('Dropping all enums...');
  await db.execute(sql`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typtype = 'e') LOOP
        EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
      END LOOP;
    END $$;
  `);

  // Needed for gen_random_uuid() defaults.
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './migrations' });

  console.log('Database reset complete!');
  await client.end();
  process.exit(0);
}

resetDatabase().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
