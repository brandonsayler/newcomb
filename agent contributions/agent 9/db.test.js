// tests/db.test.js — Database Layer Tests
// Agent 9: Tests for Agent 2's database module (db.js)
//
// Expected exports from db.js:
//   - initDb()          → creates tables if not exist
//   - getDb()           → returns the sqlite3 db instance
//   - close()           → closes the connection
//
// Expected schema:
//   users:  id (INTEGER PK), username (TEXT UNIQUE), password_hash (TEXT), created_at (TEXT)
//   tasks:  id (INTEGER PK), user_id (INTEGER FK), title (TEXT), description (TEXT),
//           completed (INTEGER 0/1), created_at (TEXT), updated_at (TEXT)

const path = require('path');
const fs = require('fs');

// Set test environment before requiring modules
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = path.join(__dirname, 'test_db.db');
process.env.JWT_SECRET = 'test-secret';

let db;

beforeAll(async () => {
  // Dynamically require to respect env vars set above
  db = require('../db');
  await db.initDb();
});

afterAll(async () => {
  await db.close();
  try { fs.unlinkSync(process.env.DATABASE_PATH); } catch (e) {}
});

describe('Database Initialization (Agent 2)', () => {
  test('initDb() creates the database file', () => {
    expect(fs.existsSync(process.env.DATABASE_PATH)).toBe(true);
  });

  test('users table exists with correct columns', async () => {
    const instance = db.getDb();
    const result = await new Promise((resolve, reject) => {
      instance.all("PRAGMA table_info(users)", (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });
    const columnNames = result.map(r => r.name);
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('username');
    expect(columnNames).toContain('password_hash');
    expect(columnNames).toContain('created_at');
  });

  test('tasks table exists with correct columns', async () => {
    const instance = db.getDb();
    const result = await new Promise((resolve, reject) => {
      instance.all("PRAGMA table_info(tasks)", (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });
    const columnNames = result.map(r => r.name);
    expect(columnNames).toContain('id');
    expect(columnNames).toContain('user_id');
    expect(columnNames).toContain('title');
    expect(columnNames).toContain('completed');
  });

  test('users.username has UNIQUE constraint', async () => {
    const instance = db.getDb();
    const result = await new Promise((resolve, reject) => {
      instance.all("PRAGMA index_list(users)", (err, rows) => {
        if (err) reject(err); else resolve(rows);
      });
    });
    const hasUnique = result.some(r => r.unique === 1);
    expect(hasUnique).toBe(true);
  });
});
