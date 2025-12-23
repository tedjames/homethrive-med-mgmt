/**
 * Contract test helpers for validating API responses against Zod schemas.
 */
import { z } from 'zod';
import { expect } from 'vitest';

/**
 * Validates that a response matches the expected Zod schema.
 * Throws a descriptive error if validation fails.
 */
export function expectResponseToMatchSchema<T extends z.ZodType>(
  response: { json: () => unknown; statusCode: number },
  schema: T,
  expectedStatus = 200
): z.infer<T> {
  expect(response.statusCode).toBe(expectedStatus);

  const body = response.json();
  const result = schema.safeParse(body);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Response does not match schema:\n${issues}\n\nActual response:\n${JSON.stringify(body, null, 2)}`
    );
  }

  return result.data;
}

/**
 * Validates that an error response has the expected structure.
 */
export function expectErrorResponse(
  response: { json: () => unknown; statusCode: number },
  expectedStatus: number,
  expectedCode?: string
): void {
  expect(response.statusCode).toBe(expectedStatus);

  const body = response.json() as { error?: string; code?: string };
  expect(body.error).toBeDefined();
  expect(typeof body.error).toBe('string');

  if (expectedCode) {
    expect(body.code).toBe(expectedCode);
  }
}
