/**
 * V1 API routes aggregator.
 */

import type { FastifyInstance } from 'fastify';

import careRecipientsRoutes from './care-recipients.js';
import medicationsRoutes from './medications.js';
import schedulesRoutes from './schedules.js';
import dosesRoutes from './doses.js';

export default async function registerV1Routes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(careRecipientsRoutes);
  await fastify.register(medicationsRoutes);
  await fastify.register(schedulesRoutes);
  await fastify.register(dosesRoutes);
}
