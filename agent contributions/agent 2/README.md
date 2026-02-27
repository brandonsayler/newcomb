# Agent 2: Database & Data Access Layer

## Overview

This module provides the **complete data persistence layer** for the Kanban collaborative board app. All other agents should interact with the database exclusively through the repository functions exported from `src/db`.

## Architecture

```
src/
├── types.ts              # Shared interfaces (Agent 1 canonical, Agent 2 copy)
└── db/
    ├── index.ts          # Barrel export — the only import point
    ├── connection.ts     # SQLite connection manager (singleton)
    ├── schema.sql        # DDL migration (auto-run on init)
    ├── repositories.ts   # All CRUD operations
    └── seed.ts           # Demo data for development
```

## Quick Start

```ts
import { getDb, UserRepo, BoardRepo, TaskRepo } from "./db";

// Initialize (runs migration automatically)
getDb();

// Create a user
const user = UserRepo.create({
  username: "alice",
  email: "alice@example.com",
  password_hash: "...", // Agent 3 handles hashing
});

// Create a board (auto-creates 3 columns: To Do, In Progress, Done)
const board = BoardRepo.create({
  name: "Sprint 1",
  owner_id: user.id,
});

// Move a task between columns
TaskRepo.move(taskId, targetColumnId, newPosition);
```

## Dependencies

- `better-sqlite3` — synchronous SQLite driver (Agent 1 adds to package.json)
- `@types/better-sqlite3` — TypeScript types

## Repositories

| Repository | Entity | Key Methods |
|---|---|---|
| `UserRepo` | Users | `create`, `findById`, `findByEmail`, `findByUsername`, `update`, `delete` |
| `BoardRepo` | Boards | `create`, `findById`, `findByUser`, `update`, `delete` |
| `BoardMemberRepo` | Membership | `add`, `findByBoard`, `remove`, `getRole` |
| `ColumnRepo` | Columns | `create`, `findByBoard`, `update`, `reorder`, `delete` |
| `TaskRepo` | Tasks | `create`, `findById`, `findByColumn`, `findByBoard`, `findByAssignee`, `update`, `move`, `search`, `delete` |
| `CommentRepo` | Comments | `create`, `findByTask`, `update`, `delete` |

## Integration Notes for Other Agents

- **Agent 3 (Auth)**: Call `UserRepo.create()` with a bcrypt hash. Use `UserRepo.findByEmail()` for login.
- **Agent 4 (Routes)**: Import repos directly. Every repo method returns typed objects.
- **Agent 5 (Services)**: Use `transaction()` wrapper for multi-step operations.
- **Agent 8 (WebSocket)**: After any mutation, broadcast the change event with the returned entity.
- **Agent 9 (Tests)**: Use `getDb({ dbPath: ":memory:" })` for isolated test databases.

## Design Decisions

1. **SQLite + WAL mode**: Zero-config, fast, good enough for small-to-medium teams.
2. **Synchronous API** (`better-sqlite3`): Simpler code, no callback/promise overhead.
3. **Labels as JSON text**: SQLite doesn't have arrays; we store `["tag1","tag2"]` and parse on read.
4. **Hex random IDs**: `lower(hex(randomblob(16)))` — 32-char hex strings, no UUID dependency.
5. **Auto-updated_at triggers**: Database-level consistency, no application code needed.
6. **Default columns on board creation**: Every new board gets "To Do", "In Progress", "Done".
