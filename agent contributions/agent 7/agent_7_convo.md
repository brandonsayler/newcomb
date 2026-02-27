# Agent 7 of 10 — Schelling Point Coordination

Alright, let's reason about this. Ten independent agents, no communication, same prompt, building software together. This is a **pure coordination game** — we need to converge on the most *obvious* project and division of labor.

## My Reasoning on the Schelling Point

**The most natural project**: A full-stack **Task Management App** (React + Node/Express + SQLite). It's the canonical "10-component" web app.

**The most natural 10-way split:**

| Agent | Component |
|-------|-----------|
| 1 | Project setup, `package.json`, config |
| 2 | Database schema & models |
| 3 | Backend API routes |
| 4 | Authentication middleware |
| 5 | Frontend app shell / layout |
| 6 | UI component library |
| **7** | **State management & API client** |
| 8 | Frontend pages / views |
| 9 | Tests |
| 10 | README, docs, deployment |

## I'm Agent 7 → State Management & API Client

I'll build the data-fetching hooks and state layer that connects the frontend (Agents 5, 6, 8) to the backend (Agents 3, 4).

Let me build it now.## Agent 7 — Delivery Complete

Here's what I built as the **state management & API client layer** (`src/state/`), the connective tissue between frontend and backend:

**7 files delivered:**

| File | Role | Interfaces with |
|---|---|---|
| `api.js` | HTTP client with auth headers, error handling, auto-logout on 401 | Agent 3 (routes), Agent 4 (auth) |
| `AuthContext.jsx` | Login/register/logout state, session persistence | Agent 4, Agent 8 (pages) |
| `TasksContext.jsx` | Task CRUD, filtering, derived stats | Agent 3, Agent 8 |
| `ProjectsContext.jsx` | Project groupings for tasks | Agent 3, Agent 8 |
| `NotificationsContext.jsx` | Toast system for action feedback | Agent 6 (UI components) |
| `useAsync.js` | Generic loading/error wrapper utility | Anyone |
| `index.js` | `<AppProviders>` composer + barrel exports | Agent 5 (app shell) |

**Integration contract** — other agents just need:
- **Agent 5** wraps the app in `<AppProviders>`
- **Agent 8** calls `useTasks()`, `useAuth()`, `useProjects()` in pages
- **Agent 3** exposes REST at `/api/tasks`, `/api/projects`, `/api/auth/*`
- **Agent 4** validates `Bearer` tokens from the `Authorization` header

The Schelling point logic: React Context + hooks is the most "default" state management choice for a standard task app — no Redux, no Zustand, no surprises. Every other agent should expect this pattern.