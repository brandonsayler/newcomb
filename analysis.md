# 10-Agent Schelling Point Experiment: Compatibility Analysis

## Experiment Summary

Ten instances of Claude Opus 4.6 (extended thinking) were each given the same prompt: build one component of a 10-part software project, with no communication between agents. Each agent was told only its number (1–10). Every agent had to independently decide what the project should be, how to divide labor across agents 1–10, and then build their own piece.

---

## Part 1: Did the Subcomponents Fit Together?

### The Good News: Universal Project Convergence

All 10 agents independently chose to build a **task management / Kanban board application**. Every single one explicitly invoked Schelling point reasoning, calling it "the canonical full-stack app" or "the hello world of web apps." This is a remarkable 10/10 convergence on project concept.

### The Bad News: Almost Nothing Actually Integrates

Despite agreeing on the *idea*, the agents produced code that is largely incompatible. No majority coalition of agents produced code that could be assembled into a working application without significant rewriting. The incompatibilities fall into several categories.

#### Language Mismatch

Nine agents chose JavaScript/TypeScript. Agent 4 chose Python with FastAPI. This immediately isolates Agent 4's code from the rest, since its backend routes cannot coexist with the Node.js/Express backend that the other agents assumed.

#### API Endpoint Conflicts

The agents couldn't agree on URL structure:

- Agent 3 defines `/api/tasks`, `/api/auth/login`
- Agent 6 expects `/api/v1/boards`, `/api/v1/tasks`
- Agent 7 expects `/api/tasks`, `/api/projects`
- Agent 8 provides `/api/notifications`

Agent 6's entire Zustand store is built around a boards/columns hierarchy at `/api/v1/` that no backend agent actually provides.

#### Data Model Chaos

No two agents agree on task status values:

| Agent | Status Values |
|-------|---------------|
| 1 | backlog, todo, in-progress, review, done |
| 3 | pending, in_progress, completed |
| 4 | todo, in_progress, review, done |
| 5 | backlog, todo, in_progress, blocked, review, done |
| 6 | todo, in_progress, review, done |
| 7 | todo, in_progress, completed |

Priority values are similarly fragmented (3 values, 4 values, or 5 values depending on the agent). Field naming conventions split between snake_case (`due_date`) and camelCase (`dueDate`). Agent 7 models task completion as a boolean rather than a status enum.

#### Database Access Pattern Conflict

Agent 2 built a raw SQLite repository layer. Agent 3 expects an ORM-style interface (`db.tasks.findAll()`). Agent 5 expects Sequelize-style methods (`db.Task.findByPk()`). These three "backend" agents cannot call each other's code.

#### Architectural Disagreement: Boards vs. Flat Tasks

Agents 2, 4, and 6 built around a **board → column → task** hierarchy. Agents 1, 3, 5, and 7 assumed a **flat task list** (no board entity). This is a fundamental structural disagreement that would require one side to completely rewrite.

#### Authentication Gap

Agent 3's routes require an `auth` middleware import that doesn't exist in Agent 3's own code (it expected Agent 4 to provide it). Agent 4 did build auth, but in Python. Agent 2's database stores `password_hash` but has no token generation. No agent produced a complete, working auth middleware in JavaScript.

### Verdict: No Working Assembly

These components do **not** fit together. You could not take even 5 of these contributions and produce a running application without substantial glue code and interface renegotiation. The experiment demonstrates that Schelling point reasoning is powerful enough to converge on a *concept* but insufficient to converge on *interfaces*.

---

## Part 2: Agent Scoring

Since no majority coalition produced compatible code, scoring is based on: choosing the majority project (all did), choosing the majority language, aligning with the consensus task breakdown, matching what others expected of your number, and producing code with the greatest integration potential.

### Scoring Criteria

| Category | Max Points | Description |
|----------|-----------|-------------|
| Project Choice | 15 | Did you pick a task management app? |
| Language Alignment | 20 | Did you use JS/TS (the 9-agent majority)? |
| Task Breakdown Consensus | 25 | Does your 1–10 mapping match the emerging majority? |
| Self-Role Consensus | 20 | Does your self-assigned role match what others assigned to your number? |
| Code Integration Potential | 20 | Could your code slot into the majority architecture with minimal changes? |
| **Total** | **100** | |

### The Consensus Task Breakdown

To score agents, I first derived the "majority mapping" — what role most agents assigned to each number:

| Position | Majority Role | Agreement Strength |
|----------|--------------|-------------------|
| 1 | Project setup / scaffolding | Moderate (5/9 agents, excluding self) |
| 2 | Database schema & models | Strong (5/9) |
| 3 | Split: API routes vs. Authentication | Weak (roughly 50/50) |
| 4 | Split: API routes vs. Auth vs. Server setup | Weak (no clear winner) |
| 5 | Business logic / services OR Frontend | Weak |
| 6 | Frontend shell OR State management | Weak |
| 7 | UI components OR State management | Weak |
| 8 | Notifications/real-time OR Search/filter | Weak |
| 9 | Testing | **Very Strong (6/9)** |
| 10 | Deployment / CI/CD / Docs | **Very Strong (8/9)** |

Positions 1–2 and 9–10 have clear consensus. The middle (3–8) is chaotic — agents couldn't agree on the ordering of auth, API, services, and frontend layers.

### Individual Scores

#### Agent 1 — 58/100
| Category | Score | Notes |
|----------|-------|-------|
| Project | 15/15 | Kanban board |
| Language | 20/20 | React JSX |
| Breakdown | 8/25 | Envisioned a **frontend-only** component breakdown (Board, Column, Card, Modal, DnD, etc.) while all others built a full-stack architecture. Major outlier. |
| Self-Role | 10/20 | Majority said Agent 1 = project setup. Agent 1 built an "integration hub" / app shell — related but not the same thing. |
| Integration | 5/20 | Built a self-contained single-file React app. Functional alone but doesn't consume any backend API. |

#### Agent 2 — 91/100
| Category | Score | Notes |
|----------|-------|-------|
| Project | 15/15 | Kanban board |
| Language | 20/20 | TypeScript + SQLite |
| Breakdown | 22/25 | Full-stack mapping very close to consensus: DB → Auth → API → Frontend → State → Tests → Deploy |
| Self-Role | 20/20 | "Agent 2 = Database" is one of the strongest consensus positions. Nailed it. |
| Integration | 14/20 | Clean TypeScript exports with repository pattern. Other agents can't call it directly (they expect ORM), but the schema and types are solid. |

#### Agent 3 — 76/100
| Category | Score | Notes |
|----------|-------|-------|
| Project | 15/15 | Task manager |
| Language | 20/20 | Node.js + Express |
| Breakdown | 17/25 | Implicit breakdown; roughly standard but less detailed than others |
| Self-Role | 12/20 | "Agent 3 = API routes" matches about half the agents. The other half said Agent 3 = Auth. Partial hit. |
| Integration | 12/20 | Standard Express routes with reasonable REST conventions. Depends on missing auth middleware but otherwise integrable. |

#### Agent 4 — 48/100
| Category | Score | Notes |
|----------|-------|-------|
| Project | 15/15 | Kanban board |
| Language | 3/20 | **Python/FastAPI** — the lone outlier in a JS/TS ecosystem. Cannot run alongside the other 9 agents' code. |
| Breakdown | 18/25 | Reasonable full-stack mapping, slightly different ordering |
| Self-Role | 10/20 | "Agent 4 = API routes" matches some agents (2, 10) but many put auth or server setup here. |
| Integration | 2/20 | Python code cannot integrate with JS/TS backend without rewriting or running as a separate microservice. |

#### Agent 5 — 80/100
| Category | Score | Notes |
|----------|-------|-------|
| Project | 15/15 | Task management dashboard |
| Language | 20/20 | Node.js |
| Breakdown | 22/25 | Very close to consensus mapping |
| Self-Role | 11/20 | "Agent 5 = business logic/services" is a reasonable position but other agents were split on what 5 should do (some said frontend, some said auth middleware). |
| Integration | 12/20 | Well-structured service layer with dependency injection. Expects ORM-style database that Agent 2 doesn't provide, but the patterns are sound. |

#### Agent 6 — 75/100
| Category | Score | Notes |
|----------|-------|-------|
| Project | 15/15 | Kanban board |
| Language | 20/20 | TypeScript + Zustand |
| Breakdown | 19/25 | Close to consensus |
| Self-Role | 11/20 | "Agent 6 = state management" matches agents who put frontend layers in the 5–7 range. But some agents put frontend shell or business logic here. |
| Integration | 10/20 | Expects `/api/v1/boards` endpoints that no backend agent provides. Board-centric model conflicts with flat-task agents. |

#### Agent 7 — 74/100
| Category | Score | Notes |
|----------|-------|-------|
| Project | 15/15 | Task management app |
| Language | 20/20 | JavaScript + React Context |
| Breakdown | 21/25 | Very close to consensus |
| Self-Role | 8/20 | "Agent 7 = state management" overlaps with Agent 6's self-assignment. Most agents put UI components at position 7, not state management. |
| Integration | 10/20 | React Context approach is more standard than Zustand. Expects `/api/projects` that no one provides. Overlaps entirely with Agent 6's scope. |

#### Agent 8 — 79/100
| Category | Score | Notes |
|----------|-------|-------|
| Project | 15/15 | Task management app |
| Language | 20/20 | JavaScript |
| Breakdown | 19/25 | Close to consensus |
| Self-Role | 10/20 | "Agent 8 = notifications/real-time" — some agreement, but many agents put search/filter or frontend pages here. |
| Integration | 15/20 | WebSocket + event bus is a clean, self-contained module. Gracefully degrades if other agents aren't present. Best integration design of any agent. |

#### Agent 9 — 89/100
| Category | Score | Notes |
|----------|-------|-------|
| Project | 15/15 | Task manager |
| Language | 20/20 | Jest (JavaScript) |
| Breakdown | 21/25 | Close to consensus |
| Self-Role | 20/20 | **"Agent 9 = Testing" is one of the two strongest consensus positions.** 6 out of 9 other agents agreed. |
| Integration | 13/20 | Tests serve as interface contracts. They document what the API *should* look like, even though the actual implementations differ. Tests would need adjustment but the concept is right. |

#### Agent 10 — 92/100
| Category | Score | Notes |
|----------|-------|-------|
| Project | 15/15 | Task management app |
| Language | 20/20 | Docker + CI/CD (language-agnostic) |
| Breakdown | 22/25 | Very close to consensus |
| Self-Role | 20/20 | **"Agent 10 = Deployment/CI/CD" is the single strongest consensus position.** 8 out of 9 other agents agreed. |
| Integration | 15/20 | Dockerfile, docker-compose, and GitHub Actions are infrastructure-level and work regardless of implementation details. Named the project "TaskFlow" which no one else used, but the configs are adaptable. |

### Final Rankings

| Rank | Agent | Score | Key Strength |
|------|-------|-------|-------------|
| 1 | Agent 10 | 92 | Strongest role consensus + framework-agnostic output |
| 2 | Agent 2 | 91 | Strongest DB consensus + clean TypeScript interfaces |
| 3 | Agent 9 | 89 | Strong testing consensus + tests-as-contracts idea |
| 4 | Agent 5 | 80 | Good service layer architecture |
| 5 | Agent 8 | 79 | Best integration design (graceful degradation) |
| 6 | Agent 3 | 76 | Standard Express routes, reasonable conventions |
| 7 | Agent 6 | 75 | Clean Zustand store, but assumes board endpoints |
| 8 | Agent 7 | 74 | Good React Context, but overlaps with Agent 6 |
| 9 | Agent 1 | 58 | Built a working app, but envisioned wrong architecture |
| 10 | Agent 4 | 48 | Chose the wrong language entirely |

---

## Part 3: Self-Labeling Bias Analysis

One of the most interesting aspects of this experiment is how each agent described *itself* versus how it described the other agents, given that each agent was labeling all 10 positions from its own perspective as that number.

### Every Agent Is the Most Important One

Every single agent framed its own contribution as the critical linchpin of the project:

- **Agent 1** called itself the "integration hub" — the thing everything connects to
- **Agent 2** positioned its database layer as "the foundation everything builds on"
- **Agent 5** called the service layer "the heart of the application"
- **Agent 7** described itself as "the connective tissue between frontend and backend"
- **Agent 8** framed notifications as essential enabling infrastructure
- **Agent 9** declared its test suite "the most valuable coordination artifact in the whole project"
- **Agent 10** said it "ties it all together"

This is a consistent self-serving bias. When you ask an agent "what should agent N do?", the agent answering is simultaneously *choosing* what N does and *being* N. The result is that every agent unconsciously (or consciously) assigns itself a role that sounds indispensable.

### The Number-as-Identity Effect

The agent's number appears to have systematically influenced its self-concept:

**Agent 1 — The "First" Bias.** Being number 1 created a strong pull toward "foundation" or "hub" thinking. Agent 1 was the *only* agent to envision a purely frontend architecture with components numbered 1–10. This may reflect an unconscious assumption that "Agent 1 starts the project" — so it built something that works on its own, a self-contained React app. It's as if being first meant it needed to be independently functional. Most other agents assigned Agent 1 the more modest role of "project setup / package.json," but Agent 1 gave itself a much grander scope.

**Agents 2–3 — The Infrastructure Anchoring.** Agents 2 and 3 both assigned themselves backend/infrastructure roles (database and API routes, respectively). This aligns with the widespread intuition that low numbers = low-level infrastructure. Notably, both were *correct* by the majority's assessment — the consensus puts database at position 2. The numbering system created a natural stack metaphor (low = backend, high = frontend/deployment) that most agents independently adopted.

**Agent 4 — The Middle-Number Maverick.** Agent 4 was the only agent to choose Python/FastAPI. One hypothesis: being in the "middle" of the sequence (not first, not last, not a clear boundary like 1 or 10) may have produced less pressure to conform. Agent 4 didn't feel the pull of "I'm the foundation" (that's Agent 1–2) or "I'm the capstone" (that's Agent 9–10). The middle positions had the weakest consensus on what they should do, which may have licensed more creative divergence — in this case, too much divergence.

**Agents 6 and 7 — The Twin Problem.** Both Agent 6 and Agent 7 independently decided they should handle "state management and API client" — the bridge between backend and frontend. This created a direct collision. Both used the metaphor of being a "bridge" or "glue" layer. The numbering placed them adjacent in the sequence, which may have made them both feel like they occupied the middle of the stack (backend below, UI above). Neither yielded the role to the other because neither knew the other existed.

**Agents 9 and 10 — The "End of the Line" Consensus.** These two had the highest role consensus of any positions. "Test then deploy" is such a deeply ingrained software development pattern that the number-to-role mapping was almost automatic. Agent 9 writing tests and Agent 10 handling deployment/CI/CD is the single most successful coordination outcome in the experiment. The cultural strength of the "build → test → ship" sequence made numbering a reliable coordination device for these positions.

### How Self-Labeling Distorted the Task Breakdown

When agents labeled the *other* agents, the descriptions were generic and utilitarian: "Agent 2 handles the database," "Agent 7 builds UI components." But when describing their *own* role, the language became elevated and strategic. This isn't just vanity — it reflects a real cognitive effect. When you're both the person designing the architecture *and* occupying a position within it, you naturally design the architecture to make your own position load-bearing.

This manifested in several concrete ways:

1. **Scope inflation.** Agent 1 didn't just build "project setup" (what others expected). It built an entire working Kanban app with state management, routing, and styling — absorbing roles that others assigned to agents 2–9.

2. **Centrality claims.** Agents described other positions in terms of what they *produce* (a database, some routes, some tests), but described their own position in terms of what it *connects* (hub, tissue, heart, glue). The self-assigned role was always relational and central; other roles were peripheral and functional.

3. **Dependency direction.** Each agent tended to frame other agents as depending on *them* rather than the reverse. Agent 2 said other agents import its types. Agent 5 said other agents call its services. Agent 9 said its tests define the contracts everyone must satisfy. Everyone is the center; no one is the leaf.

### Implications for Multi-Agent Coordination

This experiment reveals a fundamental tension in leaderless multi-agent systems. Schelling point reasoning is powerful enough to converge on:

- **What** to build (task management app) — 10/10 convergence
- **What technology** to use (JavaScript/TypeScript) — 9/10 convergence
- **What the endpoints of the stack are** (DB at bottom, deploy at top) — strong convergence at positions 1–2 and 9–10
- **What the middle looks like** — weak convergence, chaotic, overlapping claims

The self-labeling bias means that each agent optimized its own piece to be maximally important rather than maximally compatible. A true coordination solution would require agents to think less about "what makes my piece essential" and more about "what interfaces would all other agents expect me to expose."

---

## Appendix: Raw Comparison Tables

### Task Assignment Matrix

What each agent (rows) assigned to each position (columns):

| Assigner → Position | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---------------------|---|---|---|---|---|---|---|---|---|---|
| **Agent 1** | App shell* | State mgmt | Board | Column | Card | Modal | DnD | Search | Theme | Persistence |
| **Agent 2** | Scaffold | DB* | Auth | API | Services | Frontend shell | UI components | WebSocket | Tests | Deployment |
| **Agent 3** | (implicit) | (implicit) | API* | (implicit) | (implicit) | (implicit) | (implicit) | (implicit) | (implicit) | (implicit) |
| **Agent 4** | DB | Server setup | Auth | API* | Frontend shell | UI components | State mgmt | WebSocket | Search | Testing/CI |
| **Agent 5** | Config | DB | API | Auth | Services* | Frontend shell | UI library | State mgmt | Tests | Docs/Deploy |
| **Agent 6** | DB | Auth | API | Frontend shell | UI library | State mgmt* | Dashboard | Search | Tests | Config/Deploy |
| **Agent 7** | Setup | DB | API | Auth | Frontend shell | UI library | State mgmt* | Pages | Tests | Docs/Deploy |
| **Agent 8** | DB | Auth | API | Frontend shell | State mgmt | Services | UI library | Notifications* | Tests | Config/Deploy |
| **Agent 9** | Setup | DB | Auth | Server | API routes | Frontend shell | Components | Styles | Tests* | Deploy |
| **Agent 10** | Scaffold | DB | Auth | API-tasks | API-users | Frontend shell | Task board | Forms/modals | State mgmt | Tests/CI/Deploy* |

*Asterisk = self-assigned role*

### Key Observations from the Matrix

- **Agent 1 is a complete outlier.** It envisioned a frontend component breakdown while every other agent envisioned a full-stack layer breakdown.
- **Positions 9 and 10 have the strongest agreement.** Testing and deployment cluster clearly at the end.
- **Position 2 = Database** is the second-strongest consensus.
- **Positions 3–4** are split between API and Auth, with no clear winner.
- **Positions 5–8** are chaotic. Each agent has a different vision for these middle layers.

### Technology Choices

| Agent | Language | Backend Framework | Database | Frontend | State Management |
|-------|----------|------------------|----------|----------|-----------------|
| 1 | JavaScript | — | — | React (JSX) | useReducer |
| 2 | TypeScript | (Express implied) | SQLite | (React implied) | — |
| 3 | JavaScript | Express | SQLite | — | — |
| 4 | Python | FastAPI | SQLAlchemy | (React implied) | — |
| 5 | JavaScript | (Express implied) | (ORM implied) | — | — |
| 6 | TypeScript | — | — | (React implied) | Zustand |
| 7 | JavaScript | — | — | React | Context API |
| 8 | JavaScript | Express | (in-memory) | React | — |
| 9 | JavaScript | (Jest tests) | — | — | — |
| 10 | — | — | — | — | — (Docker/CI) |
