/**
 * Authentication API Tests — Agent 10
 *
 * Tests for Agent 3's auth module exposed through the API.
 * Covers: registration, login, token refresh, and error cases.
 */

const request = require('supertest');
const {
  TEST_USER,
  TEST_USER_2,
  createTestApp,
  destroyTestApp,
} = require('../fixtures/setup');

describe('Auth API — /api/auth', () => {
  let app;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await destroyTestApp();
  });

  // ── Registration ────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('should register a new user and return 201', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(TEST_USER)
        .expect(201);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(TEST_USER.email);
      expect(res.body.user.name).toBe(TEST_USER.name);
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should reject duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(TEST_USER)
        .expect(409);

      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toMatch(/already exists|duplicate/i);
    });

    it('should reject missing required fields', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'no-password@test.com' })
        .expect(400);
    });

    it('should reject invalid email format', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: 'Valid123!', name: 'Bad' })
        .expect(400);
    });

    it('should reject weak passwords', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'weak@test.com', password: '123', name: 'Weak' })
        .expect(400);
    });
  });

  // ── Login ───────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('should return a JWT token on valid login', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password })
        .expect(200);

      expect(res.body).toHaveProperty('token');
      expect(typeof res.body.token).toBe('string');
      expect(res.body.token.split('.')).toHaveLength(3); // JWT format
    });

    it('should reject wrong password', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: 'WrongPassword!' })
        .expect(401);
    });

    it('should reject non-existent user', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'Whatever123!' })
        .expect(401);
    });
  });

  // ── Token Refresh ───────────────────────────────────────

  describe('POST /api/auth/refresh', () => {
    let token;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_USER.email, password: TEST_USER.password });
      token = res.body.token;
    });

    it('should return a new token when given a valid token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('token');
      expect(res.body.token).not.toBe(token); // New token issued
    });

    it('should reject requests without a token', async () => {
      await request(app)
        .post('/api/auth/refresh')
        .expect(401);
    });

    it('should reject invalid tokens', async () => {
      await request(app)
        .post('/api/auth/refresh')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .expect(401);
    });
  });
});
