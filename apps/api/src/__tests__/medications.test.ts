/**
 * Medications API Tests
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { buildTestApp, closeTestApp, authHeader, generateTestUserId } from '../tests/helpers.js';

describe('Medications API', () => {
  let app: FastifyInstance;
  let testUserId: string;
  let recipientId: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  beforeEach(async () => {
    testUserId = await generateTestUserId();
    // Create a care recipient for medication tests
    const createResponse = await app.inject({
      method: 'POST',
      url: '/v1/recipients',
      headers: authHeader(testUserId),
      payload: { displayName: 'Mom' },
    });
    recipientId = createResponse.json().data.id;
  });

  describe('POST /v1/recipients/:recipientId/medications', () => {
    it('creates a medication with daily schedule', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Aspirin',
          instructions: 'Take with food',
          schedules: [
            {
              recurrence: 'daily',
              timeOfDay: '08:00',
              startDate: '2024-01-01',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.data.medication).toBeDefined();
      expect(body.data.medication.name).toBe('Aspirin');
      expect(body.data.medication.instructions).toBe('Take with food');
      expect(body.data.schedules).toHaveLength(1);
      expect(body.data.schedules[0].recurrence).toBe('daily');
    });

    it('creates a medication with weekly schedule', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Vitamin D',
          schedules: [
            {
              recurrence: 'weekly',
              timeOfDay: '09:00',
              daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
              startDate: '2024-01-01',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.data.medication.name).toBe('Vitamin D');
      expect(body.data.schedules[0].recurrence).toBe('weekly');
      expect(body.data.schedules[0].daysOfWeek).toEqual([1, 3, 5]);
    });

    it('creates a medication with multiple schedules', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Insulin',
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

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.data.schedules).toHaveLength(2);
    });

    it('returns 400 for missing schedules', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Aspirin',
          schedules: [],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for weekly schedule without daysOfWeek', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Test',
          schedules: [
            {
              recurrence: 'weekly',
              timeOfDay: '09:00',
              startDate: '2024-01-01',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for daily schedule with daysOfWeek', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Test',
          schedules: [
            {
              recurrence: 'daily',
              timeOfDay: '09:00',
              daysOfWeek: [1, 2],
              startDate: '2024-01-01',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 401 without auth header', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        payload: {
          name: 'Test',
          schedules: [{ recurrence: 'daily', timeOfDay: '09:00', startDate: '2024-01-01' }],
        },
      });

      expect(response.statusCode).toBe(401);
    });

    // INPUT VALIDATION
    it('returns 400 for invalid time format 25:00', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Test',
          schedules: [{ recurrence: 'daily', timeOfDay: '25:00', startDate: '2024-01-01' }],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for invalid time format 8:0', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Test',
          schedules: [{ recurrence: 'daily', timeOfDay: '8:0', startDate: '2024-01-01' }],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for daysOfWeek containing 0', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Test',
          schedules: [
            {
              recurrence: 'weekly',
              timeOfDay: '09:00',
              daysOfWeek: [0, 1, 2],
              startDate: '2024-01-01',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for daysOfWeek containing 8', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Test',
          schedules: [
            {
              recurrence: 'weekly',
              timeOfDay: '09:00',
              daysOfWeek: [1, 8],
              startDate: '2024-01-01',
            },
          ],
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /v1/recipients/:recipientId/medications', () => {
    it('returns empty array for recipient with no medications', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toEqual([]);
    });

    it('returns medications for recipient', async () => {
      // Create a medication
      await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Aspirin',
          schedules: [{ recurrence: 'daily', timeOfDay: '08:00', startDate: '2024-01-01' }],
        },
      });

      // List medications
      const response = await app.inject({
        method: 'GET',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].name).toBe('Aspirin');
      expect(body.data[0].isActive).toBe(true);
    });

    it('excludes inactive medications by default', async () => {
      // Create and deactivate a medication
      const createResponse = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Old Med',
          schedules: [{ recurrence: 'daily', timeOfDay: '08:00', startDate: '2024-01-01' }],
        },
      });
      const medicationId = createResponse.json().data.medication.id;

      await app.inject({
        method: 'POST',
        url: `/v1/medications/${medicationId}/deactivate`,
        headers: authHeader(testUserId),
      });

      // List medications
      const response = await app.inject({
        method: 'GET',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toHaveLength(0);
    });

    it('includes inactive medications when requested', async () => {
      // Create and deactivate a medication
      const createResponse = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Old Med',
          schedules: [{ recurrence: 'daily', timeOfDay: '08:00', startDate: '2024-01-01' }],
        },
      });
      const medicationId = createResponse.json().data.medication.id;

      await app.inject({
        method: 'POST',
        url: `/v1/medications/${medicationId}/deactivate`,
        headers: authHeader(testUserId),
      });

      // List medications with includeInactive
      const response = await app.inject({
        method: 'GET',
        url: `/v1/recipients/${recipientId}/medications?includeInactive=true`,
        headers: authHeader(testUserId),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toHaveLength(1);
      expect(body.data[0].isActive).toBe(false);
    });

    // AUTHORIZATION
    it('returns empty array for another user\'s recipient', async () => {
      // User A creates medication
      await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Aspirin',
          schedules: [{ recurrence: 'daily', timeOfDay: '08:00', startDate: '2024-01-01' }],
        },
      });

      // User B tries to list User A's recipient's medications
      const otherUserId = await generateTestUserId();
      const response = await app.inject({
        method: 'GET',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(otherUserId),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toEqual([]);
    });
  });

  describe('GET /v1/medications/:id', () => {
    it('returns a specific medication', async () => {
      // Create a medication
      const createResponse = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Aspirin',
          schedules: [{ recurrence: 'daily', timeOfDay: '08:00', startDate: '2024-01-01' }],
        },
      });
      const medicationId = createResponse.json().data.medication.id;

      // Fetch it
      const response = await app.inject({
        method: 'GET',
        url: `/v1/medications/${medicationId}`,
        headers: authHeader(testUserId),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.id).toBe(medicationId);
      expect(body.data.name).toBe('Aspirin');
    });

    it('returns 404 for non-existent medication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/medications/00000000-0000-0000-0000-000000000000',
        headers: authHeader(testUserId),
      });

      expect(response.statusCode).toBe(404);
    });

    // AUTHORIZATION
    it('returns 404 for another user\'s medication', async () => {
      // User A creates medication
      const createResponse = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Aspirin',
          schedules: [{ recurrence: 'daily', timeOfDay: '08:00', startDate: '2024-01-01' }],
        },
      });
      const medicationId = createResponse.json().data.medication.id;

      // User B tries to get User A's medication
      const otherUserId = await generateTestUserId();
      const response = await app.inject({
        method: 'GET',
        url: `/v1/medications/${medicationId}`,
        headers: authHeader(otherUserId),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /v1/medications/:id', () => {
    it('updates medication name', async () => {
      // Create a medication
      const createResponse = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Aspirin',
          schedules: [{ recurrence: 'daily', timeOfDay: '08:00', startDate: '2024-01-01' }],
        },
      });
      const medicationId = createResponse.json().data.medication.id;

      // Update it
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/medications/${medicationId}`,
        headers: authHeader(testUserId),
        payload: { name: 'Aspirin 100mg' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.name).toBe('Aspirin 100mg');
    });

    it('returns 409 when updating inactive medication', async () => {
      // Create and deactivate a medication
      const createResponse = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Old Med',
          schedules: [{ recurrence: 'daily', timeOfDay: '08:00', startDate: '2024-01-01' }],
        },
      });
      const medicationId = createResponse.json().data.medication.id;

      await app.inject({
        method: 'POST',
        url: `/v1/medications/${medicationId}/deactivate`,
        headers: authHeader(testUserId),
      });

      // Try to update
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/medications/${medicationId}`,
        headers: authHeader(testUserId),
        payload: { name: 'Updated' },
      });

      expect(response.statusCode).toBe(409);
      const body = response.json();
      expect(body.code).toBe('MEDICATION_INACTIVE');
    });

    // AUTHORIZATION
    it('returns 404 for another user\'s medication', async () => {
      // User A creates medication
      const createResponse = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Aspirin',
          schedules: [{ recurrence: 'daily', timeOfDay: '08:00', startDate: '2024-01-01' }],
        },
      });
      const medicationId = createResponse.json().data.medication.id;

      // User B tries to update User A's medication
      const otherUserId = await generateTestUserId();
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/medications/${medicationId}`,
        headers: authHeader(otherUserId),
        payload: { name: 'Hacked Name' },
      });

      expect(response.statusCode).toBe(404);
    });

    // BUSINESS RULE
    it('returns 409 when updating only instructions on inactive medication', async () => {
      // Create and deactivate a medication
      const createResponse = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Old Med',
          instructions: 'Take with water',
          schedules: [{ recurrence: 'daily', timeOfDay: '08:00', startDate: '2024-01-01' }],
        },
      });
      const medicationId = createResponse.json().data.medication.id;

      await app.inject({
        method: 'POST',
        url: `/v1/medications/${medicationId}/deactivate`,
        headers: authHeader(testUserId),
      });

      // Try to update only instructions (should still fail)
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/medications/${medicationId}`,
        headers: authHeader(testUserId),
        payload: { instructions: 'New instructions' },
      });

      expect(response.statusCode).toBe(409);
      const body = response.json();
      expect(body.code).toBe('MEDICATION_INACTIVE');
    });
  });

  describe('POST /v1/medications/:id/deactivate', () => {
    it('deactivates a medication', async () => {
      // Create a medication
      const createResponse = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Aspirin',
          schedules: [{ recurrence: 'daily', timeOfDay: '08:00', startDate: '2024-01-01' }],
        },
      });
      const medicationId = createResponse.json().data.medication.id;

      // Deactivate it
      const response = await app.inject({
        method: 'POST',
        url: `/v1/medications/${medicationId}/deactivate`,
        headers: authHeader(testUserId),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.isActive).toBe(false);
    });

    it('returns 404 for non-existent medication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/medications/00000000-0000-0000-0000-000000000000/deactivate',
        headers: authHeader(testUserId),
      });

      expect(response.statusCode).toBe(404);
    });

    // AUTHORIZATION
    it('returns 404 for another user\'s medication', async () => {
      // User A creates medication
      const createResponse = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Aspirin',
          schedules: [{ recurrence: 'daily', timeOfDay: '08:00', startDate: '2024-01-01' }],
        },
      });
      const medicationId = createResponse.json().data.medication.id;

      // User B tries to deactivate User A's medication
      const otherUserId = await generateTestUserId();
      const response = await app.inject({
        method: 'POST',
        url: `/v1/medications/${medicationId}/deactivate`,
        headers: authHeader(otherUserId),
      });

      expect(response.statusCode).toBe(404);
    });

    // BUSINESS RULE
    it('returns 200 when deactivating already-inactive medication', async () => {
      // Create a medication
      const createResponse = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Aspirin',
          schedules: [{ recurrence: 'daily', timeOfDay: '08:00', startDate: '2024-01-01' }],
        },
      });
      const medicationId = createResponse.json().data.medication.id;

      // First deactivation
      const firstResponse = await app.inject({
        method: 'POST',
        url: `/v1/medications/${medicationId}/deactivate`,
        headers: authHeader(testUserId),
      });

      expect(firstResponse.statusCode).toBe(200);
      expect(firstResponse.json().data.isActive).toBe(false);

      // Second deactivation (should succeed, not error)
      const secondResponse = await app.inject({
        method: 'POST',
        url: `/v1/medications/${medicationId}/deactivate`,
        headers: authHeader(testUserId),
      });

      expect(secondResponse.statusCode).toBe(200);
      expect(secondResponse.json().data.isActive).toBe(false);
    });
  });
});
