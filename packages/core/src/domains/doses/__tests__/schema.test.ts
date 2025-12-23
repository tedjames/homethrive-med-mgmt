/**
 * Schema validation tests for the Dose domain.
 */

import { describe, expect, it } from 'vitest';

import { listDosesQuerySchema, markDoseTakenInputSchema } from '../schema.js';

describe('listDosesQuerySchema', () => {
  it('coerces from/to to Date', () => {
    const result = listDosesQuerySchema.safeParse({
      from: '2024-12-01T00:00:00Z',
      to: '2024-12-02T00:00:00Z',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.from).toBeInstanceOf(Date);
      expect(result.data.to).toBeInstanceOf(Date);
      expect(result.data.includeInactive).toBe(false);
    }
  });

  it('defaults includeInactive to false', () => {
    const result = listDosesQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.includeInactive).toBe(false);
    }
  });
});

describe('markDoseTakenInputSchema', () => {
  it('requires non-empty doseId', () => {
    expect(markDoseTakenInputSchema.safeParse({ doseId: '' }).success).toBe(false);
    expect(markDoseTakenInputSchema.safeParse({ doseId: 'v1:abc' }).success).toBe(true);
  });
});
