# TaskFlow

A collaborative Kanban board app synthesized from 10 independent AI agent contributions.

## Quick Start

```bash
npm install
npm start
# Open http://localhost:3000
```

## Architecture

Single Node.js server (Express + SQLite + WebSocket) serving a React frontend. No build step required.

## Agent Attribution

| Agent | What they contributed to this build |
|-------|-------------------------------------|
| 1 | Dark theme, drag-and-drop UI, card/column design, priority badges |
| 2 | SQLite schema (users, boards, columns, tasks, comments), repository pattern |
| 3 | Express route factory, input validation, pagination, auth routes |
| 4 | Board/column/task hierarchy concept, auto-generated default columns |
| 5 | Status state machine, error classes (NotFound, Forbidden, Validation), service patterns |
| 6 | Optimistic update pattern, API fetch wrapper, type definitions |
| 7 | Auth context pattern, token management, API client structure |
| 8 | WebSocket real-time broadcast, event bus, auto-reconnect |
| 9 | Interface contracts (what endpoints/fields should exist) |
| 10 | Dockerfile, docker-compose.yml, README structure |

## API

All endpoints require `Authorization: Bearer <token>` except auth routes.

**Auth:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`

**Boards:** `GET /api/boards`, `POST /api/boards`, `DELETE /api/boards/:id`

**Columns:** `GET /api/boards/:id/columns`, `POST /api/boards/:id/columns`, `PUT /api/boards/:id/columns/:colId`, `DELETE /api/boards/:id/columns/:colId`

**Tasks:** `GET /api/boards/:id/tasks`, `POST /api/boards/:id/tasks`, `PUT /api/boards/:id/tasks/:taskId`, `PATCH /api/boards/:id/tasks/:taskId/move`, `DELETE /api/boards/:id/tasks/:taskId`

**Stats:** `GET /api/boards/:id/stats`

**Comments:** `GET /api/tasks/:taskId/comments`, `POST /api/tasks/:taskId/comments`
