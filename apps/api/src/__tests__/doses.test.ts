/**
 * Doses API Tests
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { buildTestApp, closeTestApp, authHeader, generateTestUserId } from '../tests/helpers.js';

describe('Doses API', () => {
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

    // Create a care recipient
    const recipientResponse = await app.inject({
      method: 'POST',
      url: '/v1/recipients',
      headers: authHeader(testUserId),
      payload: { displayName: 'Mom', timezone: 'America/New_York' },
    });
    recipientId = recipientResponse.json().data.id;
  });

  describe('GET /v1/recipients/:recipientId/doses', () => {
    it('returns empty array for recipient with no medications', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/recipients/${recipientId}/doses`,
        headers: authHeader(testUserId),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toEqual([]);
    });

    it('returns upcoming doses for recipient with medication', async () => {
      // Create a medication with a daily schedule starting today
      const today = new Date().toISOString().split('T')[0];
      await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Aspirin',
          schedules: [
            {
              recurrence: 'daily',
              timeOfDay: '08:00',
              timezone: 'America/New_York',
              startDate: today,
            },
          ],
        },
      });

      // List doses for the next week
      const fromDate = new Date();
      const toDate = new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      const response = await app.inject({
        method: 'GET',
        url: `/v1/recipients/${recipientId}/doses?from=${fromDate.toISOString()}&to=${toDate.toISOString()}`,
        headers: authHeader(testUserId),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      // Should have at least some doses
      expect(body.data.length).toBeGreaterThan(0);
      expect(body.data[0].medicationName).toBe('Aspirin');
      expect(body.data[0].status).toBe('scheduled');
    });

    it('returns 401 without auth header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/recipients/${recipientId}/doses`,
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 400 for invalid date format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/v1/recipients/${recipientId}/doses?from=invalid-date`,
        headers: authHeader(testUserId),
      });

      expect(response.statusCode).toBe(400);
    });

    // AUTHORIZATION
    it('returns empty array for another user\'s recipient', async () => {
      // Create medication for User A's recipient
      const today = new Date().toISOString().split('T')[0];
      await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Aspirin',
          schedules: [{ recurrence: 'daily', timeOfDay: '08:00', startDate: today }],
        },
      });

      // User B tries to list User A's recipient's doses
      const otherUserId = await generateTestUserId();
      const fromDate = new Date();
      const toDate = new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      const response = await app.inject({
        method: 'GET',
        url: `/v1/recipients/${recipientId}/doses?from=${fromDate.toISOString()}&to=${toDate.toISOString()}`,
        headers: authHeader(otherUserId),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data).toEqual([]);
    });

    // BUSINESS RULE
    it('excludes doses scheduled after medication deactivation', async () => {
      // Create medication with schedule starting today
      const today = new Date().toISOString().split('T')[0];
      const createResponse = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Aspirin',
          schedules: [
            {
              recurrence: 'daily',
              timeOfDay: '08:00',
              timezone: 'America/New_York',
              startDate: today,
            },
          ],
        },
      });
      const medicationId = createResponse.json().data.medication.id;

      // Get doses before deactivation (should have some)
      const fromDate = new Date();
      const toDate = new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      const beforeResponse = await app.inject({
        method: 'GET',
        url: `/v1/recipients/${recipientId}/doses?from=${fromDate.toISOString()}&to=${toDate.toISOString()}`,
        headers: authHeader(testUserId),
      });
      const dosesBefore = beforeResponse.json().data;
      expect(dosesBefore.length).toBeGreaterThan(0);

      // Deactivate medication
      await app.inject({
        method: 'POST',
        url: `/v1/medications/${medicationId}/deactivate`,
        headers: authHeader(testUserId),
      });

      // Get doses after deactivation - future doses should be excluded
      // Query for doses starting tomorrow to ensure we're checking post-deactivation
      const tomorrow = new Date(fromDate.getTime() + 24 * 60 * 60 * 1000);
      const afterResponse = await app.inject({
        method: 'GET',
        url: `/v1/recipients/${recipientId}/doses?from=${tomorrow.toISOString()}&to=${toDate.toISOString()}`,
        headers: authHeader(testUserId),
      });
      const dosesAfter = afterResponse.json().data;

      // All future doses should be filtered out
      expect(dosesAfter.length).toBe(0);
    });
  });

  describe('POST /v1/doses/:doseId/taken', () => {
    it('marks a dose as taken', async () => {
      // Create a medication with a daily schedule starting today
      const today = new Date().toISOString().split('T')[0];
      await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Aspirin',
          schedules: [
            {
              recurrence: 'daily',
              timeOfDay: '08:00',
              timezone: 'America/New_York',
              startDate: today,
            },
          ],
        },
      });

      // Get a dose to mark as taken
      const fromDate = new Date();
      const toDate = new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      const listResponse = await app.inject({
        method: 'GET',
        url: `/v1/recipients/${recipientId}/doses?from=${fromDate.toISOString()}&to=${toDate.toISOString()}`,
        headers: authHeader(testUserId),
      });

      const doses = listResponse.json().data;
      expect(doses.length).toBeGreaterThan(0);
      const doseId = doses[0].doseId;

      // Mark as taken
      const response = await app.inject({
        method: 'POST',
        url: `/v1/doses/${doseId}/taken`,
        headers: authHeader(testUserId),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.status).toBe('taken');
      expect(body.data.takenAt).toBeDefined();
    });

    it('returns 404 for non-existent dose', async () => {
      // Create a properly encoded fake dose ID with a non-existent schedule
      // Format: v1: + base64url("scheduleId|ISO_timestamp")
      const fakeScheduleId = '00000000-0000-0000-0000-000000000000';
      const fakeTimestamp = '2050-01-01T12:00:00.000Z';
      const payload = `${fakeScheduleId}|${fakeTimestamp}`;
      const encoded = Buffer.from(payload, 'utf8').toString('base64url');
      const fakeDoseId = `v1:${encoded}`;

      const response = await app.inject({
        method: 'POST',
        url: `/v1/doses/${encodeURIComponent(fakeDoseId)}/taken`,
        headers: authHeader(testUserId),
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 400 for invalid dose ID format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/doses/invalid-dose-id/taken',
        headers: authHeader(testUserId),
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.code).toBe('INVALID_DOSE_ID');
    });

    it('returns 401 without auth header', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/doses/some-dose-id/taken',
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 409 when marking dose for inactive medication as taken', async () => {
      // Create a medication
      const today = new Date().toISOString().split('T')[0];
      const createResponse = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Old Med',
          schedules: [
            {
              recurrence: 'daily',
              timeOfDay: '08:00',
              timezone: 'America/New_York',
              startDate: today,
            },
          ],
        },
      });
      const medicationId = createResponse.json().data.medication.id;

      // Get a dose
      const fromDate = new Date();
      const toDate = new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      const listResponse = await app.inject({
        method: 'GET',
        url: `/v1/recipients/${recipientId}/doses?from=${fromDate.toISOString()}&to=${toDate.toISOString()}`,
        headers: authHeader(testUserId),
      });

      const doses = listResponse.json().data;
      const doseId = doses[0].doseId;

      // Deactivate the medication
      await app.inject({
        method: 'POST',
        url: `/v1/medications/${medicationId}/deactivate`,
        headers: authHeader(testUserId),
      });

      // Try to mark dose as taken
      const response = await app.inject({
        method: 'POST',
        url: `/v1/doses/${encodeURIComponent(doseId)}/taken`,
        headers: authHeader(testUserId),
      });

      expect(response.statusCode).toBe(409);
      const body = response.json();
      expect(body.code).toBe('MEDICATION_INACTIVE');
    });

    // IDEMPOTENCY
    it('returns same takenAt when marking dose taken twice', async () => {
      // Create medication and get a dose
      const today = new Date().toISOString().split('T')[0];
      await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Aspirin',
          schedules: [
            {
              recurrence: 'daily',
              timeOfDay: '08:00',
              timezone: 'America/New_York',
              startDate: today,
            },
          ],
        },
      });

      const fromDate = new Date();
      const toDate = new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      const listResponse = await app.inject({
        method: 'GET',
        url: `/v1/recipients/${recipientId}/doses?from=${fromDate.toISOString()}&to=${toDate.toISOString()}`,
        headers: authHeader(testUserId),
      });

      const doses = listResponse.json().data;
      const doseId = doses[0].doseId;

      // Mark as taken first time
      const firstResponse = await app.inject({
        method: 'POST',
        url: `/v1/doses/${encodeURIComponent(doseId)}/taken`,
        headers: authHeader(testUserId),
      });

      expect(firstResponse.statusCode).toBe(200);
      const firstTakenAt = firstResponse.json().data.takenAt;

      // Mark as taken second time
      const secondResponse = await app.inject({
        method: 'POST',
        url: `/v1/doses/${encodeURIComponent(doseId)}/taken`,
        headers: authHeader(testUserId),
      });

      expect(secondResponse.statusCode).toBe(200);
      const secondTakenAt = secondResponse.json().data.takenAt;

      // takenAt should be the same (idempotent)
      expect(secondTakenAt).toBe(firstTakenAt);
    });

    // AUTHORIZATION
    it('returns 404 when marking another user\'s dose as taken', async () => {
      // User A creates medication
      const today = new Date().toISOString().split('T')[0];
      await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Aspirin',
          schedules: [
            {
              recurrence: 'daily',
              timeOfDay: '08:00',
              timezone: 'America/New_York',
              startDate: today,
            },
          ],
        },
      });

      // Get a dose ID
      const fromDate = new Date();
      const toDate = new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      const listResponse = await app.inject({
        method: 'GET',
        url: `/v1/recipients/${recipientId}/doses?from=${fromDate.toISOString()}&to=${toDate.toISOString()}`,
        headers: authHeader(testUserId),
      });

      const doses = listResponse.json().data;
      const doseId = doses[0].doseId;

      // User B tries to mark User A's dose as taken
      const otherUserId = await generateTestUserId();
      const response = await app.inject({
        method: 'POST',
        url: `/v1/doses/${encodeURIComponent(doseId)}/taken`,
        headers: authHeader(otherUserId),
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
