/**
 * Users & Teams API Tests — Agent 10
 *
 * Tests for Agent 5's user and team routes.
 * Covers: profile, teams CRUD, invitations, and access control.
 */

const request = require('supertest');
const {
  TEST_USER,
  TEST_USER_2,
  TEST_TEAM,
  createTestApp,
  destroyTestApp,
  authenticatedAgent,
} = require('../fixtures/setup');

describe('Users & Teams API', () => {
  let app, agent1, agent2;

  beforeAll(async () => {
    ({ app } = await createTestApp());
    agent1 = await authenticatedAgent(app, TEST_USER);
    agent2 = await authenticatedAgent(app, TEST_USER_2);
  });

  afterAll(async () => {
    await destroyTestApp();
  });

  // ── User Profile ────────────────────────────────────────

  describe('GET /api/users/me', () => {
    it('should return the current user profile', async () => {
      const res = await agent1.get('/api/users/me').expect(200);

      expect(res.body.email).toBe(TEST_USER.email);
      expect(res.body.name).toBe(TEST_USER.name);
      expect(res.body).not.toHaveProperty('password');
    });
  });

  describe('PUT /api/users/me', () => {
    it('should update the user name', async () => {
      const res = await agent1
        .put('/api/users/me')
        .send({ name: 'Alice Updated' })
        .expect(200);

      expect(res.body.name).toBe('Alice Updated');
    });

    it('should not allow changing email to an existing one', async () => {
      await agent1
        .put('/api/users/me')
        .send({ email: TEST_USER_2.email })
        .expect(409);
    });
  });

  // ── Teams ───────────────────────────────────────────────

  describe('POST /api/teams', () => {
    it('should create a team', async () => {
      const res = await agent1
        .post('/api/teams')
        .send(TEST_TEAM)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe(TEST_TEAM.name);
      expect(res.body).toHaveProperty('owner_id');
    });

    it('should reject teams without a name', async () => {
      await agent1
        .post('/api/teams')
        .send({ description: 'No name' })
        .expect(400);
    });
  });

  describe('GET /api/teams/:id', () => {
    let teamId;

    beforeAll(async () => {
      const res = await agent1.get('/api/teams').expect(200);
      teamId = res.body[0]?.id;
    });

    it('should return team details for a member', async () => {
      const res = await agent1.get(`/api/teams/${teamId}`).expect(200);

      expect(res.body.name).toBe(TEST_TEAM.name);
      expect(res.body).toHaveProperty('members');
    });

    it('should return 403 for non-members', async () => {
      await agent2.get(`/api/teams/${teamId}`).expect(403);
    });

    it('should return 404 for non-existent team', async () => {
      await agent1.get('/api/teams/99999').expect(404);
    });
  });

  // ── Team Invitations ────────────────────────────────────

  describe('POST /api/teams/:id/invite', () => {
    let teamId;

    beforeAll(async () => {
      const res = await agent1.get('/api/teams').expect(200);
      teamId = res.body[0]?.id;
    });

    it('should invite a user to the team', async () => {
      await agent1
        .post(`/api/teams/${teamId}/invite`)
        .send({ email: TEST_USER_2.email })
        .expect(200);
    });

    it('should allow invited user to view team', async () => {
      await agent2.get(`/api/teams/${teamId}`).expect(200);
    });

    it('should reject duplicate invitations', async () => {
      await agent1
        .post(`/api/teams/${teamId}/invite`)
        .send({ email: TEST_USER_2.email })
        .expect(409);
    });

    it('should only allow owners to invite', async () => {
      await agent2
        .post(`/api/teams/${teamId}/invite`)
        .send({ email: 'third@example.com' })
        .expect(403);
    });
  });
});
