/**
 * API Contract Tests
 *
 * These tests verify that API responses match their expected schemas,
 * ensuring the API contract remains stable.
 */
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { buildTestApp, closeTestApp, authHeader, generateTestUserId } from '../tests/helpers.js';
import { expectResponseToMatchSchema, expectErrorResponse } from '../tests/contract-helpers.js';
import { responses } from '../schemas/responses.js';

describe('API Contract Tests', () => {
  let app: FastifyInstance;
  let testUserId: string;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  beforeEach(async () => {
    testUserId = await generateTestUserId();
  });

  describe('Care Recipients Contracts', () => {
    it('POST /v1/recipients returns correct schema', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/recipients',
        headers: authHeader(testUserId),
        payload: { displayName: 'Mom', timezone: 'America/New_York' },
      });

      expectResponseToMatchSchema(response, responses['POST /v1/recipients'], 201);
    });

    it('GET /v1/recipients returns correct schema', async () => {
      // Create a recipient first
      await app.inject({
        method: 'POST',
        url: '/v1/recipients',
        headers: authHeader(testUserId),
        payload: { displayName: 'Mom' },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/v1/recipients',
        headers: authHeader(testUserId),
      });

      expectResponseToMatchSchema(response, responses['GET /v1/recipients']);
    });

    it('GET /v1/recipients/:id returns correct schema', async () => {
      const createResp = await app.inject({
        method: 'POST',
        url: '/v1/recipients',
        headers: authHeader(testUserId),
        payload: { displayName: 'Mom' },
      });
      const recipientId = createResp.json().data.id;

      const response = await app.inject({
        method: 'GET',
        url: `/v1/recipients/${recipientId}`,
        headers: authHeader(testUserId),
      });

      expectResponseToMatchSchema(response, responses['GET /v1/recipients/:id']);
    });

    it('PATCH /v1/recipients/:id returns correct schema', async () => {
      const createResp = await app.inject({
        method: 'POST',
        url: '/v1/recipients',
        headers: authHeader(testUserId),
        payload: { displayName: 'Mom' },
      });
      const recipientId = createResp.json().data.id;

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/recipients/${recipientId}`,
        headers: authHeader(testUserId),
        payload: { displayName: 'Mother' },
      });

      expectResponseToMatchSchema(response, responses['PATCH /v1/recipients/:id']);
    });
  });

  describe('Medications Contracts', () => {
    let recipientId: string;

    beforeEach(async () => {
      const resp = await app.inject({
        method: 'POST',
        url: '/v1/recipients',
        headers: authHeader(testUserId),
        payload: { displayName: 'Mom', timezone: 'America/New_York' },
      });
      recipientId = resp.json().data.id;
    });

    it('POST /v1/recipients/:recipientId/medications returns correct schema', async () => {
      const today = new Date().toISOString().split('T')[0];

      const response = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Aspirin',
          instructions: 'Take with food',
          schedules: [{ recurrence: 'daily', timeOfDay: '08:00', startDate: today }],
        },
      });

      expectResponseToMatchSchema(
        response,
        responses['POST /v1/recipients/:recipientId/medications'],
        201
      );
    });

    it('GET /v1/recipients/:recipientId/medications returns correct schema', async () => {
      // Create a medication first
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

      const response = await app.inject({
        method: 'GET',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
      });

      expectResponseToMatchSchema(response, responses['GET /v1/recipients/:recipientId/medications']);
    });

    it('GET /v1/medications/:id returns correct schema', async () => {
      const today = new Date().toISOString().split('T')[0];
      const createResp = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Aspirin',
          schedules: [{ recurrence: 'daily', timeOfDay: '08:00', startDate: today }],
        },
      });
      const medicationId = createResp.json().data.medication.id;

      const response = await app.inject({
        method: 'GET',
        url: `/v1/medications/${medicationId}`,
        headers: authHeader(testUserId),
      });

      expectResponseToMatchSchema(response, responses['GET /v1/medications/:id']);
    });

    it('PATCH /v1/medications/:id returns correct schema', async () => {
      const today = new Date().toISOString().split('T')[0];
      const createResp = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Aspirin',
          schedules: [{ recurrence: 'daily', timeOfDay: '08:00', startDate: today }],
        },
      });
      const medicationId = createResp.json().data.medication.id;

      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/medications/${medicationId}`,
        headers: authHeader(testUserId),
        payload: { name: 'Baby Aspirin' },
      });

      expectResponseToMatchSchema(response, responses['PATCH /v1/medications/:id']);
    });

    it('POST /v1/medications/:id/deactivate returns correct schema', async () => {
      const today = new Date().toISOString().split('T')[0];
      const createResp = await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Aspirin',
          schedules: [{ recurrence: 'daily', timeOfDay: '08:00', startDate: today }],
        },
      });
      const medicationId = createResp.json().data.medication.id;

      const response = await app.inject({
        method: 'POST',
        url: `/v1/medications/${medicationId}/deactivate`,
        headers: authHeader(testUserId),
      });

      expectResponseToMatchSchema(response, responses['POST /v1/medications/:id/deactivate']);
    });
  });

  describe('Doses Contracts', () => {
    let recipientId: string;

    beforeEach(async () => {
      const resp = await app.inject({
        method: 'POST',
        url: '/v1/recipients',
        headers: authHeader(testUserId),
        payload: { displayName: 'Mom', timezone: 'America/New_York' },
      });
      recipientId = resp.json().data.id;
    });

    it('GET /v1/recipients/:recipientId/doses returns correct schema', async () => {
      // Create medication with schedule
      const today = new Date().toISOString().split('T')[0];
      await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Aspirin',
          schedules: [
            { recurrence: 'daily', timeOfDay: '08:00', timezone: 'America/New_York', startDate: today },
          ],
        },
      });

      const fromDate = new Date();
      const toDate = new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      const response = await app.inject({
        method: 'GET',
        url: `/v1/recipients/${recipientId}/doses?from=${fromDate.toISOString()}&to=${toDate.toISOString()}`,
        headers: authHeader(testUserId),
      });

      expectResponseToMatchSchema(response, responses['GET /v1/recipients/:recipientId/doses']);
    });

    it('POST /v1/doses/:doseId/taken returns correct schema', async () => {
      // Create medication and get a dose
      const today = new Date().toISOString().split('T')[0];
      await app.inject({
        method: 'POST',
        url: `/v1/recipients/${recipientId}/medications`,
        headers: authHeader(testUserId),
        payload: {
          name: 'Aspirin',
          schedules: [
            { recurrence: 'daily', timeOfDay: '08:00', timezone: 'America/New_York', startDate: today },
          ],
        },
      });

      const fromDate = new Date();
      const toDate = new Date(fromDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      const listResp = await app.inject({
        method: 'GET',
        url: `/v1/recipients/${recipientId}/doses?from=${fromDate.toISOString()}&to=${toDate.toISOString()}`,
        headers: authHeader(testUserId),
      });
      const doses = listResp.json().data;
      const doseId = doses[0].doseId;

      const response = await app.inject({
        method: 'POST',
        url: `/v1/doses/${encodeURIComponent(doseId)}/taken`,
        headers: authHeader(testUserId),
      });

      expectResponseToMatchSchema(response, responses['POST /v1/doses/:doseId/taken']);
    });
  });

  describe('Error Response Contracts', () => {
    it('401 returns correct error schema', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/recipients',
      });

      expectErrorResponse(response, 401);
    });

    it('400 validation error returns correct schema', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/recipients',
        headers: authHeader(testUserId),
        payload: {}, // Missing required displayName
      });

      expectErrorResponse(response, 400);
    });

    it('404 returns correct error schema', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/recipients/00000000-0000-0000-0000-000000000000',
        headers: authHeader(testUserId),
      });

      expectErrorResponse(response, 404);
    });
  });
});
