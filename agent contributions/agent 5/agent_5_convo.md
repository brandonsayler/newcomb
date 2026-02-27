# Agent 5 — Core Business Logic / Service Layer

I'm going to reason about what all 10 of us would converge on, then build my part.

**The Schelling Point:** A **Task Management Dashboard** — it's the canonical 10-component web app. Here's the implicit contract we'd all arrive at:

| Agent | Component |
|-------|-----------|
| 1 | Project config, entry point, `package.json` |
| 2 | Database schema & models |
| 3 | REST API routes / controllers |
| 4 | Authentication & authorization middleware |
| 5 | **Core business logic / service layer** |
| 6 | Frontend app shell & routing |
| 7 | Reusable UI component library |
| 8 | Frontend state management |
| 9 | Test suite |
| 10 | Documentation & deployment (Docker, README) |

Let me build my part now.Now let me build the service layer — the heart of the application's business logic.**Agent 5 reporting in.** Here's what I built and why.

**My reasoning on convergence:** All 10 of us receive the same prompt and need to independently pick the same app + the same decomposition. A **Task Management Dashboard** is the strongest Schelling point — it's the canonical full-stack CRUD app with exactly the right number of natural layers. The numbering maps to a standard software stack from bottom (config) to top (docs).

**What I delivered — the Service Layer (6 services, 9 files):**

- **TaskService** — CRUD with an enforced status state machine (`backlog → todo → in_progress → review → done`), priority validation, subtasks, bulk operations, and auto-notifications on assignment/completion
- **ProjectService** — CRUD with role-based membership (admin/editor/viewer), invite notifications, project stats
- **UserService** — Profile management, personal dashboard aggregation (overdue tasks, activity feed)
- **CommentService** — Task discussion threads with `@[userId]` mention parsing and targeted notifications
- **NotificationService** — In-app notification store with optional real-time push via socket.io
- **AnalyticsService** — Burn-down charts, velocity tracking, cycle time, per-member productivity metrics

**Key design decisions for interop:**
- All services use **dependency injection** (`{ db, notificationService }`) — Agent 1 wires them, Agent 2's models plug in directly
- Custom error hierarchy (`ValidationError → 400`, `NotFoundError → 404`, `ForbiddenError → 403`) gives Agent 3 a clean mapping to HTTP
- Authorization checks assume Agent 4 already authenticated the user; services enforce *authorization* (membership, roles)
- Analytics output shapes are designed for Agent 7's chart components (time-series arrays, percentage rates)

The README includes the full wiring diagram and model contract so the other 9 agents know exactly how to connect.