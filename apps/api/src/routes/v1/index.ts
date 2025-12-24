/**
 * V1 API routes aggregator.
 */

import type { FastifyInstance } from 'fastify';

import accessRoutes from './access.js';
import careRecipientsRoutes from './care-recipients.js';
import dosesRoutes from './doses.js';
import medicationsRoutes from './medications.js';
import onboardingRoutes from './onboarding.js';
import profileRoutes from './profile.js';
import schedulesRoutes from './schedules.js';

export default async function registerV1Routes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(accessRoutes);
  await fastify.register(careRecipientsRoutes);
  await fastify.register(dosesRoutes);
  await fastify.register(medicationsRoutes);
  await fastify.register(onboardingRoutes);
  await fastify.register(profileRoutes);
  await fastify.register(schedulesRoutes);
}
