// tests/setup.js — Shared test setup & teardown
// Agent 9: Test infrastructure

const path = require('path');
const fs = require('fs');

const TEST_DB_PATH = path.join(__dirname, '..', 'test.db');

// Ensure clean state before test run
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_PATH = TEST_DB_PATH;
  process.env.JWT_SECRET = 'test-secret-key-for-testing';
  process.env.PORT = '0'; // random available port
});

// Clean up test database after all tests
afterAll(() => {
  try {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  } catch (err) {
    // ignore cleanup errors
  }
});

module.exports = { TEST_DB_PATH };
