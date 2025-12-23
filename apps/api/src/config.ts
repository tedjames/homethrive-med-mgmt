/**
 * API configuration loaded from environment variables and AWS Secrets Manager.
 * Per ADR-003: In production, database URL and Clerk keys are fetched from Secrets Manager.
 */

import { buildDatabaseUrl, getClerkSecretKey } from './utils/secrets.js';

export interface Config {
  databaseUrl: string;
  port: number;
  host: string;
  nodeEnv: 'development' | 'staging' | 'production' | 'test';
  enableClerk: boolean;
  clerkSecretKey: string | null;
}

function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Load configuration asynchronously.
 * In production, this fetches secrets from AWS Secrets Manager.
 */
export async function loadConfig(): Promise<Config> {
  const nodeEnv = getEnvOrDefault('NODE_ENV', 'development') as Config['nodeEnv'];

  // Fetch secrets in parallel
  const [databaseUrl, clerkSecretKey] = await Promise.all([
    buildDatabaseUrl(),
    getClerkSecretKey(),
  ]);

  return {
    databaseUrl,
    port: parseInt(getEnvOrDefault('PORT', '3000'), 10),
    host: getEnvOrDefault('HOST', '0.0.0.0'),
    nodeEnv,
    enableClerk: parseBoolean(process.env.ENABLE_CLERK, nodeEnv === 'production'),
    clerkSecretKey,
  };
}

// Singleton config instance
let _config: Config | null = null;

/**
 * Get configuration (async). Initializes on first call.
 * Call this during app startup to ensure secrets are loaded.
 */
export async function getConfig(): Promise<Config> {
  if (!_config) {
    _config = await loadConfig();
  }
  return _config;
}

/**
 * Get configuration synchronously.
 * Only use AFTER calling getConfig() during app initialization.
 * Throws if config hasn't been initialized.
 */
export function getConfigSync(): Config {
  if (!_config) {
    throw new Error('Config not initialized. Call await getConfig() first.');
  }
  return _config;
}

/**
 * Reset config (useful for testing).
 */
export function resetConfig(): void {
  _config = null;
}
