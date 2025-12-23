/**
 * Schedules API Tests
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { buildTestApp, closeTestApp, authHeader, generateTestUserId } from '../tests/helpers.js';

describe('Schedules API', () => {
  let app: FastifyInstance;
  let testUserId: string;
  let recipientId: string;
  let medicationId: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  beforeEach(async () => {
    testUserId = await generateTestUserId();

    // Create a care recipient
    const recipientResponse = await app.inject({
      method: 'POST',
      url: '/v1/recipients',
      headers: authHeader(testUserId),
      payload: { displayName: 'Mom' },
    });
    recipientId = recipientResponse.json().data.id;

    // Create a medication with schedules
    const medicationResponse = await app.inject({
      method: 'POST',
      url: `/v1/recipients/${recipientId}/medications`,
      headers: authHeader(testUserId),
      payload: {
        name: 'Aspirin',
        schedules: [
          {
            recurrence: 'daily',
            timeOfDay: '08:00',
            startDate: '2024-01-01',
          },
          {
            recurrence: 'daily',
            timeOfDay: '20:00',
            startDate: '2024-01-01',
          },
        ],
      },
    });
    medicationId = medicationResponse.json().data.medication.id;
  });

  describe('GET /v1/medications/:medicationId/schedules', () => {
    it('returns schedules for a medication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/medications/${medicationId}/schedules`,
        headers: authHeader(testUserId),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toHaveLength(2);
      expect(body.data[0].recurrence).toBe('daily');
      expect(body.data[0].medicationId).toBe(medicationId);
    });

    it('returns empty array for medication with no schedules', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/medications/00000000-0000-0000-0000-000000000000/schedules',
        headers: authHeader(testUserId),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toEqual([]);
    });

    it('returns 401 without auth header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/medications/${medicationId}/schedules`,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /v1/recipients/:recipientId/schedules', () => {
    it('returns all schedules for a recipient', async () => {
      // Create another medication with schedules
      await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Vitamin D',
          schedules: [
            {
              recurrence: 'weekly',
              timeOfDay: '09:00',
              daysOfWeek: [1, 3, 5],
              startDate: '2024-01-01',
            },
          ],
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: `/v1/recipients/${recipientId}/schedules`,
        headers: authHeader(testUserId),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      // 2 schedules from Aspirin + 1 from Vitamin D
      expect(body.data).toHaveLength(3);
    });

    it('returns empty array for recipient with no medications', async () => {
      // Create a new recipient with no medications
      const newRecipientResponse = await app.inject({
        method: 'POST',
        url: '/v1/recipients',
        headers: authHeader(testUserId),
        payload: { displayName: 'Dad' },
      });
      const newRecipientId = newRecipientResponse.json().data.id;

      const response = await app.inject({
        method: 'GET',
        url: `/v1/recipients/${newRecipientId}/schedules`,
        headers: authHeader(testUserId),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toEqual([]);
    });

    it('returns 401 without auth header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/recipients/${recipientId}/schedules`,
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
