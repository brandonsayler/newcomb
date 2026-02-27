# 🧩 Agent 4 — Task & Board CRUD API Routes

## Part of: **KanbanFlow** — A 10-Agent Collaborative Kanban App

---

## What This Component Does

Agent 4 provides the **core business logic API layer** — all CRUD endpoints for:

- **Boards** — create, list, get, update, delete, manage members
- **Columns** — create, list, reorder, rename, delete (with task fallback)
- **Tasks** — create, list (with filters), get, update, **drag-and-drop move**, delete

### Key Feature: Drag-and-Drop Move (`PUT /tasks/{id}/move`)

The move endpoint handles the complex position-shifting logic needed for smooth Kanban drag-and-drop, supporting both same-column reordering and cross-column moves.

---

## API Endpoints

| Method   | Path                                        | Description              |
|----------|---------------------------------------------|--------------------------|
| `POST`   | `/api/v1/boards/`                           | Create board             |
| `GET`    | `/api/v1/boards/`                           | List user's boards       |
| `GET`    | `/api/v1/boards/{id}`                       | Get board                |
| `PATCH`  | `/api/v1/boards/{id}`                       | Update board             |
| `DELETE` | `/api/v1/boards/{id}`                       | Delete board             |
| `POST`   | `/api/v1/boards/{id}/members/{uid}`         | Add member               |
| `DELETE` | `/api/v1/boards/{id}/members/{uid}`         | Remove member            |
| `POST`   | `/api/v1/boards/{bid}/columns/`             | Create column            |
| `GET`    | `/api/v1/boards/{bid}/columns/`             | List columns             |
| `PATCH`  | `/api/v1/boards/{bid}/columns/{cid}`        | Update column            |
| `DELETE` | `/api/v1/boards/{bid}/columns/{cid}`        | Delete column            |
| `POST`   | `/api/v1/boards/{bid}/tasks/`               | Create task              |
| `GET`    | `/api/v1/boards/{bid}/tasks/`               | List tasks (filterable)  |
| `GET`    | `/api/v1/boards/{bid}/tasks/{tid}`          | Get task                 |
| `PATCH`  | `/api/v1/boards/{bid}/tasks/{tid}`          | Update task              |
| `PUT`    | `/api/v1/boards/{bid}/tasks/{tid}/move`     | Move/reorder task        |
| `DELETE` | `/api/v1/boards/{bid}/tasks/{tid}`          | Delete task              |

---

## Dependencies on Other Agents

| Agent | What I Need                                  | Import Path (expected)    |
|-------|----------------------------------------------|---------------------------|
| 1     | SQLAlchemy models: Board, Column, Task, User, board_members | `app.models`         |
| 2     | FastAPI app instance, `get_db` dependency    | `app.database`            |
| 3     | `get_current_user` auth dependency           | `app.auth`                |
| 8     | `broadcast(board_id, event, data)` function  | `app.realtime` (optional) |

---

## Integration

```python
# In Agent 2's main.py:
from agent4_task_routes import register_routes

app = FastAPI(title="KanbanFlow")
register_routes(app)
```

---

## File Structure

```
agent4_task_routes/
├── __init__.py          # register_routes() entry point
├── schemas.py           # Pydantic request/response models
└── routes/
    ├── __init__.py
    ├── boards.py        # Board CRUD + membership
    ├── columns.py       # Column CRUD + reordering
    └── tasks.py         # Task CRUD + drag-and-drop move
```
