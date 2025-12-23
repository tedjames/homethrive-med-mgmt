import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/*.test.ts'],
    exclude: ['src/__tests__/smoke.test.ts'],
    setupFiles: ['src/tests/setup.ts'],
    pool: 'forks',
    maxWorkers: 1,
    env: {
      NODE_ENV: 'test',
      ENABLE_CLERK: 'false',
      DATABASE_URL: 'postgresql://homethrive_test:test_password@localhost:5433/homethrive_test',
    },
    testTimeout: 30000,
  },
});
