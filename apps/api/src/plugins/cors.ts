/**
 * CORS plugin configuration.
 */

import cors from '@fastify/cors';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

import { getConfigSync } from '../config.js';

async function corsPlugin(app: FastifyInstance): Promise<void> {
  // Use sync version - config must be initialized before plugin registration
  const config = getConfigSync();

  // Configure allowed origins based on environment
  const allowedOrigins: (string | RegExp)[] = [];

  if (config.nodeEnv === 'development' || config.nodeEnv === 'test') {
    // Allow localhost in development
    allowedOrigins.push(
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:4000',
      'http://localhost:5173', // Vite default
    );
  }

  if (config.nodeEnv === 'production' || config.nodeEnv === 'staging') {
    // Add production origins here
    // allowedOrigins.push('https://app.homethrive.com');
  }

  await app.register(cors, {
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
}

export default fp(corsPlugin, {
  name: 'cors',
});
