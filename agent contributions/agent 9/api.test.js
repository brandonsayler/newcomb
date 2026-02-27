// tests/api.test.js — API Integration Tests
// Agent 9: Tests for Agent 4's server.js + Agent 5's routes/tasks.js
//
// Expected API endpoints:
//   POST   /api/auth/register  { username, password } → { token, user }
//   POST   /api/auth/login     { username, password } → { token, user }
//   GET    /api/tasks          (auth required)        → [tasks]
//   POST   /api/tasks          { title, description } → task
//   PUT    /api/tasks/:id      { title, completed }   → task
//   DELETE /api/tasks/:id      (auth required)        → { message }
//
// Expected: Agent 4 exports `app` (Express instance) for supertest

const path = require('path');
const fs = require('fs');

process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = path.join(__dirname, 'test_api.db');
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.PORT = '0';

const request = require('supertest');

let app;
let db;

beforeAll(async () => {
  db = require('../db');
  await db.initDb();
  app = require('../server');
});

afterAll(async () => {
  await db.close();
  try { fs.unlinkSync(process.env.DATABASE_PATH); } catch (e) {}
});

// ─── Auth Endpoints (Agent 4 + Agent 3) ─────────────────────────────

describe('POST /api/auth/register', () => {
  test('registers a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.username).toBe('testuser');
  });

  test('rejects duplicate username', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser', password: 'anotherpass' });

    expect(res.status).toBe(409);
  });

  test('rejects missing username', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: 'password123' });

    expect(res.status).toBe(400);
  });

  test('rejects missing password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'newuser' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  test('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.username).toBe('testuser');
  });

  test('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  test('rejects non-existent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'password123' });

    expect(res.status).toBe(401);
  });
});

// ─── Task CRUD Endpoints (Agent 5) ──────────────────────────────────

describe('Task API (requires auth)', () => {
  let authToken;

  beforeAll(async () => {
    // Register a user and get token
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'taskuser', password: 'taskpass123' });
    authToken = res.body.token;
  });

  // Helper to set auth header
  const authGet = (url) =>
    request(app).get(url).set('Authorization', `Bearer ${authToken}`);
  const authPost = (url, body) =>
    request(app).post(url).set('Authorization', `Bearer ${authToken}`).send(body);
  const authPut = (url, body) =>
    request(app).put(url).set('Authorization', `Bearer ${authToken}`).send(body);
  const authDelete = (url) =>
    request(app).delete(url).set('Authorization', `Bearer ${authToken}`);

  describe('GET /api/tasks', () => {
    test('returns empty array initially', async () => {
      const res = await authGet('/api/tasks');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    test('rejects unauthenticated request', async () => {
      const res = await request(app).get('/api/tasks');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/tasks', () => {
    test('creates a new task', async () => {
      const res = await authPost('/api/tasks', {
        title: 'Buy groceries',
        description: 'Milk, eggs, bread',
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('Buy groceries');
      expect(res.body.description).toBe('Milk, eggs, bread');
      expect(res.body.completed).toBe(0);
    });

    test('creates a task with title only', async () => {
      const res = await authPost('/api/tasks', { title: 'Simple task' });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Simple task');
    });

    test('rejects task without title', async () => {
      const res = await authPost('/api/tasks', { description: 'no title' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/tasks (after creation)', () => {
    test('returns created tasks', async () => {
      const res = await authGet('/api/tasks');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    let taskId;

    beforeAll(async () => {
      const res = await authPost('/api/tasks', { title: 'Update me' });
      taskId = res.body.id;
    });

    test('updates task title', async () => {
      const res = await authPut(`/api/tasks/${taskId}`, { title: 'Updated title' });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated title');
    });

    test('marks task as completed', async () => {
      const res = await authPut(`/api/tasks/${taskId}`, { completed: 1 });
      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(1);
    });

    test('returns 404 for non-existent task', async () => {
      const res = await authPut('/api/tasks/99999', { title: 'Ghost' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    let taskId;

    beforeAll(async () => {
      const res = await authPost('/api/tasks', { title: 'Delete me' });
      taskId = res.body.id;
    });

    test('deletes a task', async () => {
      const res = await authDelete(`/api/tasks/${taskId}`);
      expect(res.status).toBe(200);
    });

    test('returns 404 when deleting already-deleted task', async () => {
      const res = await authDelete(`/api/tasks/${taskId}`);
      expect(res.status).toBe(404);
    });
  });

  describe('Task isolation between users', () => {
    let otherToken;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'otheruser', password: 'otherpass123' });
      otherToken = res.body.token;
    });

    test('user cannot see other user\'s tasks', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });
});
