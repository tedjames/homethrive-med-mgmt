/**
 * Smoke Tests
 *
 * Quick sanity checks to verify a deployed API is functioning correctly.
 * These tests can run against any environment (local, staging, production).
 *
 * Usage:
 *   # Run against local server
 *   pnpm test:smoke
 *
 *   # Run against deployed environment
 *   API_URL=https://api.example.com AUTH_TOKEN=your-token pnpm test:smoke
 *
 * Note: Tests that require authentication will be skipped if AUTH_TOKEN is not set.
 */
import { describe, it, expect, afterAll } from 'vitest';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.AUTH_TOKEN;

function authHeaders(): Record<string, string> {
  if (!AUTH_TOKEN) {
    throw new Error('AUTH_TOKEN required for authenticated tests');
  }
  return { Authorization: `Bearer ${AUTH_TOKEN}` };
}

describe('Smoke Tests', () => {
  describe('Health & Basic Connectivity', () => {
    it('health endpoint returns ok', async () => {
      const res = await fetch(`${API_URL}/health`);
      expect(res.ok).toBe(true);

      const body = await res.json();
      expect(body.status).toBe('ok');
    });

    it('protected endpoints require authentication', async () => {
      const res = await fetch(`${API_URL}/v1/recipients`);
      expect(res.status).toBe(401);
    });
  });

  describe('Authenticated Operations', () => {
    // Skip authenticated tests if no token provided
    const itAuth = AUTH_TOKEN ? it : it.skip;

    let recipientId: string | null = null;

    afterAll(async () => {
      // Cleanup: We don't delete recipients since there's no delete endpoint
      // In a real smoke test, you might use a dedicated test user that gets cleaned up separately
    });

    itAuth('can create and retrieve a care recipient', async () => {
      // Create
      const createRes = await fetch(`${API_URL}/v1/recipients`, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: `Smoke Test ${Date.now()}`,
          timezone: 'America/New_York',
        }),
      });

      expect(createRes.status).toBe(201);
      const createBody = await createRes.json();
      expect(createBody.data.id).toBeDefined();
      recipientId = createBody.data.id;

      // Retrieve
      const getRes = await fetch(`${API_URL}/v1/recipients/${recipientId}`, {
        headers: authHeaders(),
      });

      expect(getRes.ok).toBe(true);
      const getBody = await getRes.json();
      expect(getBody.data.id).toBe(recipientId);
    });

    itAuth('can create a medication with schedule', async () => {
      // Ensure we have a recipient from the previous test
      if (!recipientId) {
        const createRes = await fetch(`${API_URL}/v1/recipients`, {
          method: 'POST',
          headers: {
            ...authHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            displayName: `Smoke Test ${Date.now()}`,
            timezone: 'America/New_York',
          }),
        });
        const body = await createRes.json();
        recipientId = body.data.id;
      }

      const today = new Date().toISOString().split('T')[0];
      const createRes = await fetch(`${API_URL}/v1/recipients/${recipientId}/medications`, {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `Smoke Test Med ${Date.now()}`,
          schedules: [
            {
              recurrence: 'daily',
              timeOfDay: '08:00',
              startDate: today,
            },
          ],
        }),
      });

      expect(createRes.status).toBe(201);
      const body = await createRes.json();
      expect(body.data.medication.id).toBeDefined();
      expect(body.data.schedules).toHaveLength(1);
    });

    itAuth('can list doses for a recipient', async () => {
      if (!recipientId) {
        return; // Skip if no recipient from previous tests
      }

      const from = new Date();
      const to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);

      const res = await fetch(
        `${API_URL}/v1/recipients/${recipientId}/doses?from=${from.toISOString()}&to=${to.toISOString()}`,
        { headers: authHeaders() }
      );

      expect(res.ok).toBe(true);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });
  });
});
