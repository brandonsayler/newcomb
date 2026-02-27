# Agent 5 — Service Layer Integration Guide

## What This Is

The **core business logic layer** for the Task Management Dashboard, a 10-agent collaborative build. This module sits between the API routes (Agent 3) and the database models (Agent 2), enforcing all business rules, authorization, validations, and side effects.

## Architecture

```
┌───────────────────────────────────────────────────────────────┐
│  Agent 6-8: Frontend (Shell, Components, State)               │
├───────────────────────────────────────────────────────────────┤
│  Agent 3: API Routes / Controllers                            │
│    ↕ calls                                                    │
│  ★ Agent 5: Service Layer (this module)  ← YOU ARE HERE       │
│    ↕ queries                                                  │
│  Agent 2: Database Models (Prisma / Sequelize)                │
├───────────────────────────────────────────────────────────────┤
│  Agent 4: Auth Middleware (attaches req.user)                  │
│  Agent 1: Config / Entry Point                                │
│  Agent 9: Tests    │    Agent 10: Docs / Deploy               │
└───────────────────────────────────────────────────────────────┘
```

## Services Provided

| Service               | Purpose                                |
|-----------------------|----------------------------------------|
| `TaskService`         | CRUD, status state machine, subtasks   |
| `ProjectService`      | CRUD, membership, role-based access    |
| `UserService`         | Profiles, dashboard, user search       |
| `CommentService`      | Task discussions, @mentions            |
| `NotificationService` | In-app alerts, real-time via socket.io |
| `AnalyticsService`    | Burn-down, velocity, member metrics    |

## Wiring Example (for Agent 1 or Agent 3)

```js
const db = require('./models');          // Agent 2
const { NotificationService, TaskService, ProjectService,
        UserService, CommentService, AnalyticsService } = require('./services');

// Boot order matters: NotificationService is a dependency of others
const notificationService = new NotificationService({ db, io: socketIoServer });
const taskService         = new TaskService({ db, notificationService });
const projectService      = new ProjectService({ db, notificationService });
const userService         = new UserService({ db });
const commentService      = new CommentService({ db, notificationService });
const analyticsService    = new AnalyticsService({ db });
```

## Expected Models from Agent 2

| Model            | Key Fields                                                                 |
|------------------|---------------------------------------------------------------------------|
| `Task`           | id, title, description, status, priority, dueDate, projectId, assigneeId, creatorId, parentId |
| `Project`        | id, name, description, ownerId                                            |
| `ProjectMember`  | id, projectId, userId, role (admin/editor/viewer)                         |
| `User`           | id, email, displayName, avatarUrl, passwordHash, timezone, theme          |
| `Comment`        | id, taskId, body, authorId, editedAt                                      |
| `Notification`   | id, userId, type, payload (JSON string), read                             |
| `Activity`       | id, userId, action, resourceType, resourceId                              |

## Task Status State Machine

```
backlog → todo → in_progress → review → done
                     ↕              ↓
                  blocked       (reopen → todo)
```

Transitions are enforced — invalid moves throw `ValidationError`.

## Error Contract (for Agent 3)

| Error Class       | Suggested HTTP Status |
|-------------------|-----------------------|
| `ValidationError` | 400                   |
| `ForbiddenError`  | 403                   |
| `NotFoundError`   | 404                   |
| `ServiceError`    | 500                   |

All errors have `.code` and `.message` properties.
