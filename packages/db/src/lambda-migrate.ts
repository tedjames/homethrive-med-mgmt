import { SecretsManager } from '@aws-sdk/client-secrets-manager';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as path from 'path';

interface MigrationResult {
  success: boolean;
  message: string;
  error?: string;
}

export async function handler(): Promise<MigrationResult> {
  const secretArn = process.env.DATABASE_SECRET_ARN;
  const proxyEndpoint = process.env.DATABASE_PROXY_ENDPOINT;

  if (!secretArn || !proxyEndpoint) {
    return {
      success: false,
      message: 'Missing required environment variables',
      error: 'DATABASE_SECRET_ARN and DATABASE_PROXY_ENDPOINT are required',
    };
  }

  let client: ReturnType<typeof postgres> | null = null;

  try {
    // Fetch database credentials from Secrets Manager
    const secretsClient = new SecretsManager({});
    const secret = await secretsClient.getSecretValue({ SecretId: secretArn });
    const credentials = JSON.parse(secret.SecretString!);

    // Build connection string for RDS Proxy
    const connectionString = `postgresql://${credentials.username}:${credentials.password}@${proxyEndpoint}:5432/homethrive?sslmode=require`;

    // Create connection (single connection for migrations)
    client = postgres(connectionString, { max: 1, prepare: false });
    const db = drizzle(client);

    // Ensure pgcrypto extension exists (required for gen_random_uuid())
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`);

    // Run migrations - in Lambda, migrations are copied to ./migrations by CDK bundling hooks
    // The Lambda working directory is /var/task where the bundled code runs
    const migrationsFolder = path.join(process.cwd(), 'migrations');
    await migrate(db, { migrationsFolder });

    await client.end();

    return {
      success: true,
      message: 'Migrations completed successfully',
    };
  } catch (error) {
    // Ensure connection is closed on error
    if (client) {
      try {
        await client.end();
      } catch {
        // Ignore close errors
      }
    }

    return {
      success: false,
      message: 'Migration failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
