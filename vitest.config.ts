import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Default to node for backend testing
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 60000, // 60 seconds for e2e tests
    hookTimeout: 30000, // 30 seconds for setup/teardown
    pool: 'forks', // Use separate processes for better isolation
    poolOptions: {
      forks: {
        singleFork: true // Use single fork for database consistency
      }
    },
    // Use different environments based on file patterns
    environmentMatchGlobs: [
      ['frontend/**/*.test.{ts,tsx}', 'jsdom'],
      ['src/**/*.test.ts', 'node']
    ]
  }
});