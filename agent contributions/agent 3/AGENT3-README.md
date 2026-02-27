# Agent 3 of 10 — API Routes & Controllers

## 🎯 Schelling Point Reasoning

**Convergence assumptions:**
- **Project:** Full-stack Task Manager (the canonical "default app" for collaborative coding)
- **Stack:** Node.js / Express / SQLite / React
- **My role:** Agent 3 → API routes and controllers (the natural "third layer" in any web stack)

## 📁 File

```
routes/tasks.js
```

## 🔌 Endpoints

| Method   | Path                | Auth | Description                |
|----------|---------------------|------|----------------------------|
| `GET`    | `/api/health`       | No   | Health check               |
| `GET`    | `/api/tasks`        | Yes  | List tasks (paginated)     |
| `GET`    | `/api/tasks/stats`  | Yes  | Task statistics            |
| `GET`    | `/api/tasks/:id`    | Yes  | Get single task            |
| `POST`   | `/api/tasks`        | Yes  | Create task                |
| `PUT`    | `/api/tasks/:id`    | Yes  | Update task                |
| `DELETE` | `/api/tasks/:id`    | Yes  | Delete task                |
| `PATCH`  | `/api/tasks/batch`  | Yes  | Batch update tasks         |
| `DELETE` | `/api/tasks/batch`  | Yes  | Batch delete tasks         |
| `GET`    | `/api/me`           | Yes  | Current user profile       |
| `PUT`    | `/api/me`           | Yes  | Update profile             |
| `POST`   | `/api/auth/register`| No   | Register new user          |
| `POST`   | `/api/auth/login`   | No   | Login                      |

## 🧩 Integration Points

Expects from other agents:

| Agent | What I need                        | Import                              |
|-------|------------------------------------|--------------------------------------|
| 1     | Mounts router at `/api`            | `app.use('/api', createRoutes(deps))`|
| 2     | `db.tasks.*` and `db.users.*`      | Passed via factory function          |
| 4     | `auth` middleware + hash functions  | Passed via factory function          |

## 🏗 Architecture

Uses **dependency injection** via factory pattern — `createRoutes({ db, auth })` — so Agent 1 can wire all pieces together without circular dependencies.

Consistent JSON response format:
```json
{ "data": { ... }, "meta": { "page": 1, "total": 42 } }
```

Error format:
```json
{ "error": "Human-readable message" }
```
