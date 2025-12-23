/**
 * Schema validation tests for the Care Recipient domain.
 */

import { describe, expect, it } from 'vitest';

import {
  createCareRecipientInputSchema,
  updateCareRecipientInputSchema,
} from '../schema.js';

describe('createCareRecipientInputSchema', () => {
  it('accepts valid input', () => {
    const result = createCareRecipientInputSchema.safeParse({
      displayName: 'Grandma',
      timezone: 'America/New_York',
    });
    expect(result.success).toBe(true);
  });

  it('applies default timezone', () => {
    const result = createCareRecipientInputSchema.safeParse({
      displayName: 'Grandma',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.timezone).toBe('America/New_York');
    }
  });

  it('rejects empty displayName', () => {
    const result = createCareRecipientInputSchema.safeParse({
      displayName: '',
      timezone: 'America/New_York',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid timezone', () => {
    const result = createCareRecipientInputSchema.safeParse({
      displayName: 'Grandma',
      timezone: 'Not/AZone',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateCareRecipientInputSchema', () => {
  it('accepts empty object', () => {
    const result = updateCareRecipientInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial update', () => {
    const result = updateCareRecipientInputSchema.safeParse({
      displayName: 'New Name',
    });
    expect(result.success).toBe(true);
  });
});
