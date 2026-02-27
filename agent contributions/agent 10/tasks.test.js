/**
 * Tasks API Tests — Agent 10
 *
 * Tests for Agent 4's task CRUD routes.
 * Covers: create, read, update, delete, move, filtering, and auth guards.
 */

const request = require('supertest');
const {
  TEST_TASKS,
  createTestApp,
  destroyTestApp,
  authenticatedAgent,
} = require('../fixtures/setup');

describe('Tasks API — /api/tasks', () => {
  let app, agent;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent = await authenticatedAgent(app);
  });

  afterAll(async () => {
    await destroyTestApp();
  });

  // ── Auth Guard ──────────────────────────────────────────

  describe('Authentication requirement', () => {
    it('should reject unauthenticated requests', async () => {
      await request(app).get('/api/tasks').expect(401);
    });

    it('should reject requests with expired/invalid token', async () => {
      await request(app)
        .get('/api/tasks')
        .set('Authorization', 'Bearer expired.token.here')
        .expect(401);
    });
  });

  // ── Create ──────────────────────────────────────────────

  describe('POST /api/tasks', () => {
    it('should create a task and return 201', async () => {
      const task = TEST_TASKS[0];
      const res = await agent.post('/api/tasks').send(task).expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe(task.title);
      expect(res.body.status).toBe(task.status);
      expect(res.body.priority).toBe(task.priority);
      expect(res.body).toHaveProperty('created_at');
    });

    it('should create multiple tasks', async () => {
      for (const task of TEST_TASKS.slice(1)) {
        await agent.post('/api/tasks').send(task).expect(201);
      }
    });

    it('should reject tasks without a title', async () => {
      await agent
        .post('/api/tasks')
        .send({ description: 'No title here' })
        .expect(400);
    });

    it('should reject invalid status values', async () => {
      await agent
        .post('/api/tasks')
        .send({ title: 'Bad Status', status: 'invalid_status' })
        .expect(400);
    });

    it('should reject invalid priority values', async () => {
      await agent
        .post('/api/tasks')
        .send({ title: 'Bad Priority', priority: 'extreme' })
        .expect(400);
    });
  });

  // ── Read ────────────────────────────────────────────────

  describe('GET /api/tasks', () => {
    it('should return all tasks for the user', async () => {
      const res = await agent.get('/api/tasks').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(TEST_TASKS.length);
    });

    it('should filter tasks by status', async () => {
      const res = await agent
        .get('/api/tasks?status=todo')
        .expect(200);

      expect(res.body.every((t) => t.status === 'todo')).toBe(true);
    });

    it('should filter tasks by priority', async () => {
      const res = await agent
        .get('/api/tasks?priority=high')
        .expect(200);

      expect(res.body.every((t) => t.priority === 'high')).toBe(true);
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should return a single task by ID', async () => {
      const list = await agent.get('/api/tasks').expect(200);
      const taskId = list.body[0].id;

      const res = await agent.get(`/api/tasks/${taskId}`).expect(200);

      expect(res.body.id).toBe(taskId);
      expect(res.body).toHaveProperty('title');
    });

    it('should return 404 for non-existent task', async () => {
      await agent.get('/api/tasks/99999').expect(404);
    });
  });

  // ── Update ──────────────────────────────────────────────

  describe('PUT /api/tasks/:id', () => {
    it('should update a task', async () => {
      const list = await agent.get('/api/tasks').expect(200);
      const taskId = list.body[0].id;

      const res = await agent
        .put(`/api/tasks/${taskId}`)
        .send({ title: 'Updated Title', priority: 'low' })
        .expect(200);

      expect(res.body.title).toBe('Updated Title');
      expect(res.body.priority).toBe('low');
    });

    it('should return 404 for non-existent task', async () => {
      await agent
        .put('/api/tasks/99999')
        .send({ title: 'Ghost' })
        .expect(404);
    });
  });

  // ── Move (status change) ───────────────────────────────

  describe('PATCH /api/tasks/:id/move', () => {
    it('should move a task to a new status column', async () => {
      const list = await agent.get('/api/tasks').expect(200);
      const todoTask = list.body.find((t) => t.status === 'todo');

      const res = await agent
        .patch(`/api/tasks/${todoTask.id}/move`)
        .send({ status: 'in_progress' })
        .expect(200);

      expect(res.body.status).toBe('in_progress');
    });

    it('should reject invalid status transitions', async () => {
      const list = await agent.get('/api/tasks').expect(200);
      const task = list.body[0];

      await agent
        .patch(`/api/tasks/${task.id}/move`)
        .send({ status: 'invalid_column' })
        .expect(400);
    });
  });

  // ── Delete ──────────────────────────────────────────────

  describe('DELETE /api/tasks/:id', () => {
    it('should delete a task and return 204', async () => {
      const list = await agent.get('/api/tasks').expect(200);
      const taskId = list.body[0].id;

      await agent.delete(`/api/tasks/${taskId}`).expect(204);

      // Confirm it's gone
      await agent.get(`/api/tasks/${taskId}`).expect(404);
    });

    it('should return 404 for non-existent task', async () => {
      await agent.delete('/api/tasks/99999').expect(404);
    });
  });
});
