/**
 * Fastify application builder.
 */

import sensible from '@fastify/sensible';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import type { PinoLoggerOptions } from 'fastify/types/logger.js';

import { getConfigSync } from './config.js';
import { createContainer, type Container } from './container.js';
import authPlugin from './plugins/auth.js';
import corsPlugin from './plugins/cors.js';
import errorsPlugin from './plugins/errors.js';
import securityPlugin from './plugins/security.js';
import healthRoutes from './routes/health.js';
import registerV1Routes from './routes/v1/index.js';

// Environment-specific logger configuration
const loggerConfig: Record<string, PinoLoggerOptions | boolean> = {
  development: {
    level: 'debug',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
        colorize: true,
      },
    },
  },
  production: {
    level: 'info',
  },
  staging: {
    level: 'info',
  },
  test: {
    level: 'silent',
  },
};

// Fastify type augmentation for container decorator
declare module 'fastify' {
  interface FastifyInstance {
    container: Container;
  }
}

export interface BuildAppOptions extends FastifyServerOptions {
  /** Override database URL (defaults to config) */
  databaseUrl?: string;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const { databaseUrl, ...fastifyOptions } = options;
  // Use sync version - config must be initialized before buildApp is called
  const config = getConfigSync();

  const app = Fastify({
    logger: loggerConfig[config.nodeEnv] ?? true,
    ...fastifyOptions,
  });

  // Create and decorate with container
  const dbUrl = databaseUrl ?? config.databaseUrl;
  const container = createContainer(dbUrl);
  app.decorate('container', container);

  // Register plugins in order
  app.register(sensible);
  app.register(securityPlugin);
  app.register(corsPlugin);

  // Health routes (no auth required)
  app.register(healthRoutes);

  // Authenticated routes
  app.register(async (instance) => {
    await instance.register(authPlugin);
    await instance.register(registerV1Routes, { prefix: '/v1' });
  });

  // Error handler (must be last)
  app.register(errorsPlugin);

  return app;
}
