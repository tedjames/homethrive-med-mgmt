/**
 * Schema validation tests for the Medication domain.
 */

import { describe, expect, it } from 'vitest';

import { createMedicationInputSchema, updateMedicationInputSchema } from '../schema.js';

describe('createMedicationInputSchema', () => {
  it('accepts valid input', () => {
    const result = createMedicationInputSchema.safeParse({
      name: 'Aspirin',
      instructions: 'Take with food',
    });
    expect(result.success).toBe(true);
  });

  it('accepts null instructions', () => {
    const result = createMedicationInputSchema.safeParse({
      name: 'Aspirin',
      instructions: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = createMedicationInputSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name over 100 chars', () => {
    const result = createMedicationInputSchema.safeParse({ name: 'x'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('rejects instructions over 500 chars', () => {
    const result = createMedicationInputSchema.safeParse({
      name: 'Aspirin',
      instructions: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe('updateMedicationInputSchema', () => {
  it('accepts empty object', () => {
    const result = updateMedicationInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial update', () => {
    const result = updateMedicationInputSchema.safeParse({
      instructions: null,
    });
    expect(result.success).toBe(true);
  });
});
