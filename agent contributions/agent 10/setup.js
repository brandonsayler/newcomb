/**
 * Test Setup & Fixtures — Agent 10
 *
 * Shared helpers for API and frontend tests.
 * Provides an in-memory database, test server, and seed data.
 */

const path = require('path');

// ── Seed Data ───────────────────────────────────────────────

const TEST_USER = {
  email: 'alice@example.com',
  password: 'SecurePass123!',
  name: 'Alice Tester',
};

const TEST_USER_2 = {
  email: 'bob@example.com',
  password: 'AnotherPass456!',
  name: 'Bob Helper',
};

const TEST_TEAM = {
  name: 'Test Team Alpha',
  description: 'A team created for testing purposes',
};

const TEST_TASKS = [
  {
    title: 'Set up project scaffolding',
    description: 'Initialize the repo with package.json and configs',
    status: 'done',
    priority: 'high',
  },
  {
    title: 'Design database schema',
    description: 'Create tables for users, tasks, and teams',
    status: 'in_progress',
    priority: 'high',
  },
  {
    title: 'Write API tests',
    description: 'Comprehensive test coverage for all endpoints',
    status: 'todo',
    priority: 'medium',
  },
  {
    title: 'Deploy to production',
    description: 'Docker build and push to registry',
    status: 'todo',
    priority: 'low',
  },
];

// ── Test App Factory ────────────────────────────────────────

let app = null;
let db = null;

/**
 * Create a fresh test application instance with an in-memory DB.
 * Each test suite gets a clean slate.
 */
async function createTestApp() {
  // Override DB_PATH to use in-memory SQLite
  process.env.DB_PATH = ':memory:';
  process.env.JWT_SECRET = 'test-secret-do-not-use-in-production';
  process.env.JWT_EXPIRY = '1h';
  process.env.NODE_ENV = 'test';

  // Clear module cache so we get a fresh app instance
  jest.resetModules();

  // Import the app factory (expected from Agent 1's scaffold)
  const { createApp, getDb } = require('../../server/app');
  app = await createApp();
  db = getDb();

  return { app, db };
}

/**
 * Tear down the test app and close DB connections.
 */
async function destroyTestApp() {
  if (db) {
    db.close();
    db = null;
  }
  app = null;
}

// ── Auth Helpers ────────────────────────────────────────────

const request = require('supertest');

/**
 * Register a user and return the JWT token.
 */
async function registerAndLogin(appInstance, user = TEST_USER) {
  await request(appInstance)
    .post('/api/auth/register')
    .send(user)
    .expect(201);

  const res = await request(appInstance)
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password })
    .expect(200);

  return res.body.token;
}

/**
 * Create an authenticated supertest agent.
 */
async function authenticatedAgent(appInstance, user = TEST_USER) {
  const token = await registerAndLogin(appInstance, user);
  const agent = request(appInstance);

  // Return a helper that auto-attaches the auth header
  return {
    get: (url) => agent.get(url).set('Authorization', `Bearer ${token}`),
    post: (url) => agent.post(url).set('Authorization', `Bearer ${token}`),
    put: (url) => agent.put(url).set('Authorization', `Bearer ${token}`),
    patch: (url) => agent.patch(url).set('Authorization', `Bearer ${token}`),
    delete: (url) => agent.delete(url).set('Authorization', `Bearer ${token}`),
    token,
  };
}

// ── Exports ─────────────────────────────────────────────────

module.exports = {
  TEST_USER,
  TEST_USER_2,
  TEST_TEAM,
  TEST_TASKS,
  createTestApp,
  destroyTestApp,
  registerAndLogin,
  authenticatedAgent,
};
