import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/*.test.ts'],
    globalSetup: ['./src/tests/globalSetup.ts'],
    setupFiles: ['./src/tests/setup.ts'],
    // Run serially for DB isolation
    pool: 'forks',
    maxWorkers: 1,
    env: {
      DATABASE_URL: 'postgresql://homethrive_test:test_password@localhost:5433/homethrive_test',
      NODE_ENV: 'test',
    },
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/__tests__/**', 'src/tests/**', 'src/schema/**', 'src/**/index.ts'],
    },
  },
});
