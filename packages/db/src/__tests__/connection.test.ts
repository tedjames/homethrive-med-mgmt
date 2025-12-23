import { getDb, testConnection } from '../connection.js';
import { describe, it } from 'vitest';

describe('connection', () => {
  it('connects and can run a simple query', async () => {
    await testConnection(getDb());
  });
});
