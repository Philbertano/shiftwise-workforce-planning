// Test setup configuration

import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'sqlite::memory:';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';

// Mock console.log for cleaner test output
const originalLog = console.log;
console.log = (...args: any[]) => {
  // Only log errors and important messages during tests
  if (args[0]?.includes?.('error') || args[0]?.includes?.('Error') || args[0]?.includes?.('failed')) {
    originalLog(...args);
  }
};

// Global test setup
beforeAll(async () => {
  // Setup test database and other global test configuration
  console.log('Setting up test environment...');
});

afterAll(async () => {
  // Cleanup after all tests
  console.log('Cleaning up test environment...');
});