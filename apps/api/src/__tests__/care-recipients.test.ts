/**
 * Care Recipients API Tests
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';

import { buildTestApp, closeTestApp, authHeader, generateTestUserId } from '../tests/helpers.js';

describe('Care Recipients API', () => {
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

  describe('POST /v1/recipients', () => {
    it('creates a care recipient with minimal fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/recipients',
        headers: authHeader(testUserId),
        payload: { displayName: 'Mom' },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.data).toBeDefined();
      expect(body.data.displayName).toBe('Mom');
      expect(body.data.id).toBeDefined();
      expect(body.data.timezone).toBe('America/New_York'); // default
    });

    it('creates a care recipient with timezone', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/recipients',
        headers: authHeader(testUserId),
        payload: { displayName: 'Dad', timezone: 'America/Los_Angeles' },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.data.displayName).toBe('Dad');
      expect(body.data.timezone).toBe('America/Los_Angeles');
    });

    it('returns 400 for missing displayName', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/recipients',
        headers: authHeader(testUserId),
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 for invalid timezone', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/recipients',
        headers: authHeader(testUserId),
        payload: { displayName: 'Test', timezone: 'Invalid/Timezone' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('returns 401 without auth header', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/recipients',
        payload: { displayName: 'Unauthorized' },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /v1/recipients', () => {
    it('returns user own profile when no other recipients exist', async () => {
      // User's own profile is auto-created on first request via auth plugin
      const response = await app.inject({
        method: 'GET',
        url: '/v1/recipients',
        headers: authHeader(testUserId),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      // Auto-created own profile should be present
      expect(body.data).toHaveLength(1);
      expect(body.data[0].userId).toBe(testUserId);
    });

    it('returns recipients including user own profile and created ones', async () => {
      // Create a recipient (own profile is auto-created on first request)
      await app.inject({
        method: 'POST',
        url: '/v1/recipients',
        headers: authHeader(testUserId),
        payload: { displayName: 'Mom' },
      });

      // List recipients
      const response = await app.inject({
        method: 'GET',
        url: '/v1/recipients',
        headers: authHeader(testUserId),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      // Should have own profile + created recipient
      expect(body.data).toHaveLength(2);
      // Find the created recipient (not the auto-created one)
      const createdRecipient = body.data.find((r: { displayName: string }) => r.displayName === 'Mom');
      expect(createdRecipient).toBeDefined();
    });

    it('returns 401 without auth header', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/recipients',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /v1/recipients/:id', () => {
    it('returns a specific recipient', async () => {
      // Create a recipient
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/recipients',
        headers: authHeader(testUserId),
        payload: { displayName: 'Mom' },
      });
      const recipientId = createResponse.json().data.id;

      // Fetch it
      const response = await app.inject({
        method: 'GET',
        url: `/v1/recipients/${recipientId}`,
        headers: authHeader(testUserId),
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.id).toBe(recipientId);
      expect(body.data.displayName).toBe('Mom');
    });

    it('returns 404 for non-existent recipient', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/recipients/00000000-0000-0000-0000-000000000000',
        headers: authHeader(testUserId),
      });

      expect(response.statusCode).toBe(404);
    });

    it('returns 404 for another user\'s recipient', async () => {
      // Create recipient as user1
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/recipients',
        headers: authHeader(testUserId),
        payload: { displayName: 'Mom' },
      });
      const recipientId = createResponse.json().data.id;

      // Try to fetch as user2
      const otherUserId = await generateTestUserId();
      const response = await app.inject({
        method: 'GET',
        url: `/v1/recipients/${recipientId}`,
        headers: authHeader(otherUserId),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /v1/recipients/:id', () => {
    it('updates recipient displayName', async () => {
      // Create a recipient
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/recipients',
        headers: authHeader(testUserId),
        payload: { displayName: 'Mom' },
      });
      const recipientId = createResponse.json().data.id;

      // Update it
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/recipients/${recipientId}`,
        headers: authHeader(testUserId),
        payload: { displayName: 'Mother' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.displayName).toBe('Mother');
    });

    it('updates recipient timezone', async () => {
      // Create a recipient
      const createResponse = await app.inject({
        method: 'POST',
        url: '/v1/recipients',
        headers: authHeader(testUserId),
        payload: { displayName: 'Mom' },
      });
      const recipientId = createResponse.json().data.id;

      // Update it
      const response = await app.inject({
        method: 'PATCH',
        url: `/v1/recipients/${recipientId}`,
        headers: authHeader(testUserId),
        payload: { timezone: 'Europe/London' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.data.timezone).toBe('Europe/London');
    });

    it('returns 404 for non-existent recipient', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/recipients/00000000-0000-0000-0000-000000000000',
        headers: authHeader(testUserId),
        payload: { displayName: 'Updated' },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
