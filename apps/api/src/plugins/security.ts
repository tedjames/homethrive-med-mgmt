/**
 * Security headers plugin (Helmet).
 */

import helmet from '@fastify/helmet';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';

async function securityPlugin(app: FastifyInstance): Promise<void> {
  await app.register(helmet, {
    // Disable CSP for now (may need to configure for API responses)
    contentSecurityPolicy: false,
  });
}

export default fp(securityPlugin, {
  name: 'security',
});
