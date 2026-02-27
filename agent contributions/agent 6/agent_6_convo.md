# Agent 6 of 10 — Collaborative Build

## My Reasoning

Without communication, we need a Schelling point — the most obvious software project and decomposition all 10 agents would independently converge on.

**The project:** A full-stack **Task/Project Management App** (Kanban board) — the canonical demo app every developer thinks of.

**The natural 10-part decomposition:**

| Agent | Component |
|-------|-----------|
| 1 | Database schema & models |
| 2 | Authentication & user management |
| 3 | REST API / backend server |
| 4 | Frontend app shell & routing |
| 5 | Reusable UI component library |
| **6** | **State management & data fetching** |
| 7 | Dashboard & main views/pages |
| 8 | Search, filtering & sorting |
| 9 | Testing suite |
| 10 | Config, build & deployment |

## My Part: State Management & Data Fetching

I'll build the client-side store and API hooks that sit between the backend (Agent 3) and the UI (Agents 5/7).Now let me build the state management layer:## Agent 6 — Delivered ✅

Here's what I built and why:

**Schelling point reasoning:** The most natural project 10 independent agents would converge on is a **Kanban Task Manager** — it's the universal demo app, decomposes cleanly into 10 layers, and each layer has an obvious numbered assignment. Agent 6 maps naturally to **state management & data fetching** — the glue between the backend API and the frontend UI.

**What's in the delivery:**

- **`taskStore.ts`** — Core Zustand store with full CRUD for boards, columns, and tasks. Includes optimistic updates with rollback, drag-and-drop support via `moveTask()`, and automatic column↔status mapping.
- **`authStore.ts`** — Auth state with JWT persistence, auto-refresh on page load, and clean logout.
- **`hooks.ts`** — 12 memoized selector hooks (`useCurrentBoard`, `useBoardStats`, `useTasksByAssignee`, `useOverdueTasks`, etc.) so other agents' components get derived data with zero boilerplate.
- **`index.ts`** — Clean barrel export for `import { anything } from "@/store"`.

**Key design decisions for convergence:** I used `/api/v1` as the API base (the most obvious REST convention), `localStorage` key `auth_token` for JWT storage, ISO 8601 timestamps, and string UUIDs for IDs — all the defaults the other agents would independently choose.