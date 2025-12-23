/**
 * AWS Secrets Manager utility for fetching secrets.
 * Per ADR-003: Database and Clerk credentials are fetched from Secrets Manager in production.
 */

import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

// Lazy-init client only when needed (avoids issues in local dev)
let client: SecretsManagerClient | null = null;

function getClient(): SecretsManagerClient {
  if (!client) {
    client = new SecretsManagerClient({});
  }
  return client;
}

// Cache secrets to avoid repeated API calls during Lambda lifetime
const secretCache = new Map<string, unknown>();

/**
 * Fetch a secret from AWS Secrets Manager with caching.
 */
export async function getSecret<T>(secretArn: string): Promise<T> {
  if (secretCache.has(secretArn)) {
    return secretCache.get(secretArn) as T;
  }

  const command = new GetSecretValueCommand({ SecretId: secretArn });
  const response = await getClient().send(command);

  if (!response.SecretString) {
    throw new Error(`Secret ${secretArn} has no string value`);
  }

  const secret = JSON.parse(response.SecretString) as T;
  secretCache.set(secretArn, secret);
  return secret;
}

/**
 * Database secret structure from RDS-generated secrets.
 */
export interface DbSecret {
  username: string;
  password: string;
  host: string;
  port: number;
  dbname: string;
}

/**
 * Clerk secret structure.
 */
export interface ClerkSecret {
  secretKey: string;
}

/**
 * Build DATABASE_URL from Secrets Manager or environment.
 * - Production: Fetches from DATABASE_SECRET_ARN, uses DATABASE_PROXY_ENDPOINT
 * - Local dev: Uses DATABASE_URL directly
 */
export async function buildDatabaseUrl(): Promise<string> {
  const proxyEndpoint = process.env.DATABASE_PROXY_ENDPOINT;
  const secretArn = process.env.DATABASE_SECRET_ARN;

  // Local dev - use DATABASE_URL directly
  if (!secretArn || !proxyEndpoint) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL required for local development');
    }
    return url;
  }

  // Production - build URL from secrets + proxy endpoint
  const secret = await getSecret<DbSecret>(secretArn);
  return `postgresql://${secret.username}:${encodeURIComponent(secret.password)}@${proxyEndpoint}:5432/${secret.dbname}?sslmode=require`;
}

/**
 * Get Clerk secret key from Secrets Manager or environment.
 * - Production: Fetches from CLERK_SECRET_ARN
 * - Local dev: Uses CLERK_SECRET_KEY directly
 */
export async function getClerkSecretKey(): Promise<string | null> {
  const secretArn = process.env.CLERK_SECRET_ARN;

  // Local dev - use env var directly
  if (!secretArn) {
    return process.env.CLERK_SECRET_KEY ?? null;
  }

  // Production - fetch from Secrets Manager
  const secret = await getSecret<ClerkSecret>(secretArn);
  return secret.secretKey;
}

/**
 * Clear the secret cache (useful for testing).
 */
export function clearSecretCache(): void {
  secretCache.clear();
}
