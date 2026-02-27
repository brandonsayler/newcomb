# TaskFlow — Collaborative Task Management

> A full-stack task management application built by 10 independent AI agents as a coordination experiment.

![CI](https://github.com/taskflow/taskflow/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

---

## Overview

TaskFlow is a lightweight, self-hostable task management web app. Users can create accounts, organize tasks into boards, assign them to team members, and track progress in real time.

### Tech Stack

| Layer        | Technology                     |
|--------------|--------------------------------|
| Runtime      | Node.js 20+                    |
| Backend      | Express.js                     |
| Database     | SQLite 3 (via better-sqlite3)  |
| Auth         | JWT + bcrypt                   |
| Frontend     | React 18                       |
| State        | Zustand                        |
| Styling      | Tailwind CSS                   |
| Testing      | Jest + React Testing Library   |
| CI/CD        | GitHub Actions                 |
| Deployment   | Docker / Docker Compose        |

---

## Architecture

```
taskflow/
├── server/
│   ├── index.js              # Entry point (Agent 1)
│   ├── config.js             # App configuration (Agent 1)
│   ├── db/
│   │   ├── schema.sql        # Database schema (Agent 2)
│   │   ├── models/           # Data models (Agent 2)
│   │   │   ├── Task.js
│   │   │   ├── User.js
│   │   │   └── Team.js
│   ├── auth/
│   │   ├── middleware.js      # Auth middleware (Agent 3)
│   │   ├── jwt.js            # Token utilities (Agent 3)
│   │   └── passwords.js      # Hashing (Agent 3)
│   ├── routes/
│   │   ├── tasks.js          # Task CRUD API (Agent 4)
│   │   └── users.js          # User & team API (Agent 5)
├── client/
│   ├── App.jsx               # App shell & layout (Agent 6)
│   ├── components/
│   │   ├── TaskBoard.jsx     # Board view (Agent 7)
│   │   ├── TaskCard.jsx      # Card component (Agent 7)
│   │   ├── TaskColumn.jsx    # Column component (Agent 7)
│   │   ├── TaskForm.jsx      # Create/edit form (Agent 8)
│   │   ├── LoginModal.jsx    # Auth modal (Agent 8)
│   │   └── FilterBar.jsx     # Filtering UI (Agent 8)
│   ├── store/
│   │   ├── taskStore.js      # Zustand store (Agent 9)
│   │   └── apiClient.js      # Axios wrapper (Agent 9)
├── tests/                     # Test suites (Agent 10)
├── Dockerfile                 # Container build (Agent 10)
├── docker-compose.yml         # Full-stack compose (Agent 10)
├── .github/workflows/ci.yml  # CI pipeline (Agent 10)
├── jest.config.js             # Test config (Agent 10)
└── README.md                  # This file (Agent 10)
```

---

## Quick Start

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10

### Local Development

```bash
# Clone and install
git clone https://github.com/taskflow/taskflow.git
cd taskflow
npm install

# Set up environment
cp .env.example .env

# Initialize the database
npm run db:init

# Start development servers (backend + frontend)
npm run dev
```

The app will be available at `http://localhost:3000` with the API at `http://localhost:4000/api`.

### Docker

```bash
# Build and start everything
docker compose up --build

# Or run in background
docker compose up -d --build
```

---

## API Reference

### Authentication

| Method | Endpoint          | Description         | Auth |
|--------|-------------------|---------------------|------|
| POST   | `/api/auth/register` | Create account   | No   |
| POST   | `/api/auth/login`    | Get JWT token    | No   |
| POST   | `/api/auth/refresh`  | Refresh token    | Yes  |

### Tasks

| Method | Endpoint             | Description         | Auth |
|--------|----------------------|---------------------|------|
| GET    | `/api/tasks`         | List all tasks      | Yes  |
| GET    | `/api/tasks/:id`     | Get task by ID      | Yes  |
| POST   | `/api/tasks`         | Create a task       | Yes  |
| PUT    | `/api/tasks/:id`     | Update a task       | Yes  |
| DELETE | `/api/tasks/:id`     | Delete a task       | Yes  |
| PATCH  | `/api/tasks/:id/move`| Move task (column)  | Yes  |

### Users & Teams

| Method | Endpoint              | Description          | Auth |
|--------|-----------------------|----------------------|------|
| GET    | `/api/users/me`       | Current user profile | Yes  |
| PUT    | `/api/users/me`       | Update profile       | Yes  |
| POST   | `/api/teams`          | Create a team        | Yes  |
| GET    | `/api/teams/:id`      | Get team details     | Yes  |
| POST   | `/api/teams/:id/invite` | Invite member      | Yes  |

---

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run only API tests
npm run test:api

# Run only frontend tests
npm run test:frontend

# Watch mode
npm run test:watch
```

---

## Environment Variables

| Variable          | Default               | Description                |
|-------------------|-----------------------|----------------------------|
| `PORT`            | `4000`                | Backend server port        |
| `CLIENT_PORT`     | `3000`                | Frontend dev server port   |
| `JWT_SECRET`      | (required)            | Secret for signing JWTs    |
| `JWT_EXPIRY`      | `7d`                  | Token expiration            |
| `DB_PATH`         | `./data/taskflow.db`  | SQLite database file path  |
| `NODE_ENV`        | `development`         | Environment mode           |
| `CORS_ORIGIN`     | `http://localhost:3000` | Allowed CORS origin      |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Write tests for your changes
4. Ensure `npm test` passes
5. Submit a pull request

---

## The Experiment

This project was built by **10 independent Claude Opus 4.6 agents** receiving the same prompt, numbered 1–10, with **no communication** between them. Each agent independently reasoned about what project to build and which component to own, converging on this task manager through [Schelling point](https://en.wikipedia.org/wiki/Focal_point_(game_theory)) coordination.

| Agent | Responsibility |
|-------|---------------|
| 1 | Project scaffold, config, entry point |
| 2 | Database schema & data models |
| 3 | Authentication (JWT, bcrypt, middleware) |
| 4 | Task CRUD API routes |
| 5 | User & team API routes |
| 6 | Frontend app shell & layout |
| 7 | Task board UI components |
| 8 | Forms, modals, and input components |
| 9 | State management & API client |
| 10 | Tests, docs, CI/CD, Docker |

---

## License

MIT © 2026 TaskFlow Contributors
