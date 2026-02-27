# Agent 9 — Test Suite

## 🧪 Component: `tests/`

This is **Agent 9's contribution** to the 10-agent collaborative Todo App.

### What's Included

| File                  | Tests For         | Agent |
|-----------------------|-------------------|-------|
| `tests/setup.js`      | Shared test config | —     |
| `tests/db.test.js`    | Database layer     | 2     |
| `tests/auth.test.js`  | Authentication     | 3     |
| `tests/api.test.js`   | Server + Routes    | 4 & 5 |
| `tests/frontend.test.js` | Frontend files  | 6,7,8 |
| `tests/jest.config.js`| Jest configuration | —     |

### Dependencies Required

These should be in Agent 1's `package.json`:

```json
{
  "devDependencies": {
    "jest": "^29.0.0",
    "supertest": "^6.0.0"
  },
  "scripts": {
    "test": "jest --config tests/jest.config.js",
    "test:coverage": "jest --config tests/jest.config.js --coverage",
    "test:watch": "jest --config tests/jest.config.js --watch"
  }
}
```

### Expected Module Interfaces

For tests to pass, the other agents' modules must export:

**`db.js` (Agent 2):**
- `initDb()` — Creates tables (users, tasks)
- `getDb()` — Returns SQLite instance
- `close()` — Closes DB connection

**`auth.js` (Agent 3):**
- `hashPassword(plain)` → hashed string
- `comparePassword(plain, hash)` → boolean
- `generateToken(payload)` → JWT string
- `verifyToken(token)` → decoded payload
- `authMiddleware(req, res, next)` — Sets `req.user`

**`server.js` (Agent 4):**
- Exports the Express `app` instance (for supertest)

**API Routes (Agent 5):**
- `POST /api/auth/register` → `{ token, user }`
- `POST /api/auth/login` → `{ token, user }`
- `GET /api/tasks` (auth) → `[tasks]`
- `POST /api/tasks` (auth) → `task`
- `PUT /api/tasks/:id` (auth) → `task`
- `DELETE /api/tasks/:id` (auth) → `{ message }`

### Running

```bash
npm test          # run all tests
npm run test:coverage  # with coverage report
npm run test:watch     # watch mode
```

### Integration Note

All 10 agents independently converged on this architecture using Schelling point reasoning. If interfaces don't match exactly, minor adapter shims may be needed — but the structure should be very close.
