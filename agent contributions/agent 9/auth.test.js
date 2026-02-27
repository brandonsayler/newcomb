// tests/auth.test.js — Authentication Module Tests
// Agent 9: Tests for Agent 3's auth module (auth.js)
//
// Expected exports from auth.js:
//   - hashPassword(plain)        → returns hashed password string
//   - comparePassword(plain, hash) → returns boolean
//   - generateToken(payload)     → returns JWT string
//   - verifyToken(token)         → returns decoded payload or throws
//   - authMiddleware(req, res, next) → Express middleware, sets req.user

const path = require('path');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing';

let auth;

beforeAll(() => {
  auth = require('../auth');
});

describe('Password Hashing (Agent 3)', () => {
  test('hashPassword returns a string different from input', async () => {
    const hash = await auth.hashPassword('mypassword123');
    expect(typeof hash).toBe('string');
    expect(hash).not.toBe('mypassword123');
    expect(hash.length).toBeGreaterThan(10);
  });

  test('comparePassword returns true for matching password', async () => {
    const hash = await auth.hashPassword('secret');
    const result = await auth.comparePassword('secret', hash);
    expect(result).toBe(true);
  });

  test('comparePassword returns false for wrong password', async () => {
    const hash = await auth.hashPassword('secret');
    const result = await auth.comparePassword('wrong', hash);
    expect(result).toBe(false);
  });

  test('same password produces different hashes (salting)', async () => {
    const hash1 = await auth.hashPassword('samepassword');
    const hash2 = await auth.hashPassword('samepassword');
    expect(hash1).not.toBe(hash2);
  });
});

describe('JWT Token Management (Agent 3)', () => {
  test('generateToken returns a string', () => {
    const token = auth.generateToken({ id: 1, username: 'testuser' });
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  test('verifyToken decodes a valid token', () => {
    const payload = { id: 42, username: 'alice' };
    const token = auth.generateToken(payload);
    const decoded = auth.verifyToken(token);
    expect(decoded.id).toBe(42);
    expect(decoded.username).toBe('alice');
  });

  test('verifyToken throws on invalid token', () => {
    expect(() => auth.verifyToken('not.a.valid.token')).toThrow();
  });

  test('verifyToken throws on tampered token', () => {
    const token = auth.generateToken({ id: 1 });
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(() => auth.verifyToken(tampered)).toThrow();
  });
});

describe('Auth Middleware (Agent 3)', () => {
  test('authMiddleware rejects request without Authorization header', () => {
    const req = { headers: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    auth.authMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('authMiddleware sets req.user for valid Bearer token', () => {
    const token = auth.generateToken({ id: 7, username: 'bob' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    auth.authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(7);
    expect(req.user.username).toBe('bob');
  });
});
