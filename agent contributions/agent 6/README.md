# Agent 6 — State Management & Data Fetching

## 🧩 10-Agent Kanban Task Manager

This is **component 6 of 10** in a collaboratively built Kanban board application, where each agent independently builds one layer without direct communication.

## What This Module Does

Provides the **entire client-side state layer** for the application:

- **`taskStore`** — Zustand store with all CRUD operations for boards, columns, and tasks. Features optimistic updates with automatic rollback on failure.
- **`authStore`** — Authentication state (login, signup, logout, token persistence). Integrates with Agent 2's backend auth endpoints.
- **`hooks`** — Derived selectors and convenience hooks (`useCurrentBoard`, `useBoardStats`, `useTasksByAssignee`, etc.) for zero-boilerplate consumption by UI components.

## Integration Map

```
Agent 1 (DB Models)  →  Type definitions mirror the DB schema
Agent 2 (Auth)       →  authStore calls /auth/* endpoints, stores JWT
Agent 3 (REST API)   →  apiFetch() calls /api/v1/* endpoints
Agent 5 (UI)         ←  Components import hooks from this module
Agent 7 (Pages)      ←  Dashboard uses useBoardStats(), useCurrentBoard()
Agent 8 (Search)     ←  Extends selectors with filter/sort logic
```

## Key Files

| File | Purpose |
|------|---------|
| `src/store/taskStore.ts` | Core Zustand store — boards, tasks, columns CRUD |
| `src/store/authStore.ts` | Auth state — login/signup/logout, token management |
| `src/store/hooks.ts` | Derived selectors & convenience hooks |
| `src/store/index.ts` | Public barrel export |

## Quick Usage

```tsx
import { useCurrentBoard, useTaskActions, useBoardStats } from "@/store";

function KanbanBoard() {
  const board = useCurrentBoard();
  const { moveTask, createTask } = useTaskActions();
  const stats = useBoardStats();

  // board.columns[].tasks[] is ready to render
  // moveTask(taskId, newColumnId, order) for drag-and-drop
  // stats.completionRate for dashboard widgets
}
```

## Tech Choices

- **Zustand** — Minimal boilerplate, no providers needed, excellent TS support
- **Immer middleware** — Immutable updates with mutable syntax
- **Persist middleware** — Saves `currentBoardId` across sessions
- **Devtools middleware** — Time-travel debugging in development

## Dependencies

```json
{
  "zustand": "^4.5.0",
  "immer": "^10.0.0"
}
```

## Conventions for Other Agents

- All API paths assume Agent 3 serves at `/api/v1`
- Auth tokens stored in `localStorage` under key `auth_token`
- Environment variable `VITE_API_URL` overrides the API base URL
- All timestamps are ISO 8601 strings
- IDs are opaque strings (UUIDs from Agent 1's DB)
