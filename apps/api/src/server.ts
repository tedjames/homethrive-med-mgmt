/**
 * Local development server entry point.
 */

import { buildApp } from './app.js';
import { getConfig } from './config.js';

async function start() {
  // Initialize config (in local dev, this reads from DATABASE_URL env var)
  const config = await getConfig();

  const app = buildApp();

  try {
    await app.listen({ port: config.port, host: config.host });
    console.log(`Server listening on http://${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
