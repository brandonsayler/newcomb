"""
Agent 4 — Task Routes
CRUD operations for tasks, including drag-and-drop move support.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from ..schemas import (
    TaskCreate, TaskUpdate, TaskMove,
    TaskResponse, TaskPriority, TaskStatus, PaginatedResponse,
)

router = APIRouter(prefix="/boards/{board_id}/tasks", tags=["tasks"])


# ── CREATE ─────────────────────────────────────────────

@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    board_id: int,
    task_in: TaskCreate,
    db: Session = Depends(),
    current_user=Depends(),
):
    """Create a new task in a board. Defaults to the first column if none specified."""
    from app.models import Task, Column
    from .boards import _get_board_or_404

    board = _get_board_or_404(db, board_id, current_user)

    # Resolve target column
    if task_in.column_id:
        column = db.query(Column).filter(
            Column.id == task_in.column_id, Column.board_id == board.id
        ).first()
        if not column:
            raise HTTPException(status_code=400, detail="Column not found in this board.")
    else:
        column = (
            db.query(Column)
            .filter(Column.board_id == board.id)
            .order_by(Column.position)
            .first()
        )
        if not column:
            raise HTTPException(status_code=400, detail="Board has no columns.")

    # Auto-assign position at bottom
    if task_in.position is not None:
        position = task_in.position
    else:
        max_pos = (
            db.query(func.max(Task.position))
            .filter(Task.column_id == column.id)
            .scalar()
        )
        position = (max_pos + 1) if max_pos is not None else 0

    task = Task(
        board_id=board.id,
        column_id=column.id,
        title=task_in.title,
        description=task_in.description,
        priority=task_in.priority.value,
        status=TaskStatus.TODO.value,
        creator_id=current_user.id,
        assignee_id=task_in.assignee_id,
        due_date=task_in.due_date,
        labels=task_in.labels,
        position=position,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Notify Agent 8's WebSocket broadcast (if available)
    try:
        from app.realtime import broadcast
        await broadcast(board_id, "task.created", _task_dict(task))
    except ImportError:
        pass  # Agent 8's module not yet integrated

    return task


# ── READ (list with filters) ──────────────────────────

@router.get("/", response_model=PaginatedResponse)
async def list_tasks(
    board_id: int,
    column_id: Optional[int] = None,
    priority: Optional[TaskPriority] = None,
    status_filter: Optional[TaskStatus] = Query(None, alias="status"),
    assignee_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: Session = Depends(),
    current_user=Depends(),
):
    """List tasks in a board with optional filters."""
    from app.models import Task
    from .boards import _get_board_or_404

    _get_board_or_404(db, board_id, current_user)

    query = db.query(Task).filter(Task.board_id == board_id)

    if column_id is not None:
        query = query.filter(Task.column_id == column_id)
    if priority is not None:
        query = query.filter(Task.priority == priority.value)
    if status_filter is not None:
        query = query.filter(Task.status == status_filter.value)
    if assignee_id is not None:
        query = query.filter(Task.assignee_id == assignee_id)

    query = query.order_by(Task.column_id, Task.position)

    total = query.count()
    tasks = query.offset((page - 1) * per_page).limit(per_page).all()

    return PaginatedResponse(
        items=[TaskResponse.model_validate(t) for t in tasks],
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page,
    )


# ── READ (single) ─────────────────────────────────────

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    board_id: int,
    task_id: int,
    db: Session = Depends(),
    current_user=Depends(),
):
    """Get a single task by ID."""
    from .boards import _get_board_or_404

    _get_board_or_404(db, board_id, current_user)
    return _get_task_or_404(db, task_id, board_id)


# ── UPDATE ─────────────────────────────────────────────

@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    board_id: int,
    task_id: int,
    task_in: TaskUpdate,
    db: Session = Depends(),
    current_user=Depends(),
):
    """Update task fields (title, description, priority, assignee, etc.)."""
    from .boards import _get_board_or_404

    _get_board_or_404(db, board_id, current_user)
    task = _get_task_or_404(db, task_id, board_id)

    update_data = task_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "priority" and value is not None:
            value = value.value
        if field == "status" and value is not None:
            value = value.value
        setattr(task, field, value)

    task.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(task)

    try:
        from app.realtime import broadcast
        await broadcast(board_id, "task.updated", _task_dict(task))
    except ImportError:
        pass

    return task


# ── MOVE (drag-and-drop) ──────────────────────────────

@router.put("/{task_id}/move", response_model=TaskResponse)
async def move_task(
    board_id: int,
    task_id: int,
    move_in: TaskMove,
    db: Session = Depends(),
    current_user=Depends(),
):
    """
    Move a task to a different column and/or position.
    This is the core drag-and-drop endpoint for the Kanban UI.
    """
    from app.models import Task, Column
    from .boards import _get_board_or_404

    _get_board_or_404(db, board_id, current_user)
    task = _get_task_or_404(db, task_id, board_id)

    # Validate target column
    target_column = db.query(Column).filter(
        Column.id == move_in.column_id, Column.board_id == board_id
    ).first()
    if not target_column:
        raise HTTPException(status_code=400, detail="Target column not found.")

    old_column_id = task.column_id
    old_position = task.position
    new_column_id = move_in.column_id
    new_position = move_in.position

    if old_column_id == new_column_id:
        # Same column: shift tasks between old and new position
        if new_position > old_position:
            db.query(Task).filter(
                Task.column_id == old_column_id,
                Task.position > old_position,
                Task.position <= new_position,
                Task.id != task_id,
            ).update({Task.position: Task.position - 1})
        elif new_position < old_position:
            db.query(Task).filter(
                Task.column_id == old_column_id,
                Task.position >= new_position,
                Task.position < old_position,
                Task.id != task_id,
            ).update({Task.position: Task.position + 1})
    else:
        # Different column: close gap in old, make room in new
        db.query(Task).filter(
            Task.column_id == old_column_id,
            Task.position > old_position,
        ).update({Task.position: Task.position - 1})

        db.query(Task).filter(
            Task.column_id == new_column_id,
            Task.position >= new_position,
        ).update({Task.position: Task.position + 1})

    task.column_id = new_column_id
    task.position = new_position
    task.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(task)

    try:
        from app.realtime import broadcast
        await broadcast(board_id, "task.moved", {
            "task_id": task.id,
            "from_column": old_column_id,
            "to_column": new_column_id,
            "position": new_position,
        })
    except ImportError:
        pass

    return task


# ── DELETE ─────────────────────────────────────────────

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    board_id: int,
    task_id: int,
    db: Session = Depends(),
    current_user=Depends(),
):
    """Delete a task."""
    from app.models import Task
    from .boards import _get_board_or_404

    _get_board_or_404(db, board_id, current_user)
    task = _get_task_or_404(db, task_id, board_id)

    # Close position gap
    db.query(Task).filter(
        Task.column_id == task.column_id,
        Task.position > task.position,
    ).update({Task.position: Task.position - 1})

    db.delete(task)
    db.commit()

    try:
        from app.realtime import broadcast
        await broadcast(board_id, "task.deleted", {"task_id": task_id})
    except ImportError:
        pass


# ── Helpers ────────────────────────────────────────────

def _get_task_or_404(db: Session, task_id: int, board_id: int):
    from app.models import Task

    task = db.query(Task).filter(
        Task.id == task_id, Task.board_id == board_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    return task


def _task_dict(task) -> dict:
    """Serialize task for WebSocket broadcast."""
    return {
        "id": task.id,
        "board_id": task.board_id,
        "column_id": task.column_id,
        "title": task.title,
        "priority": task.priority,
        "status": task.status,
        "assignee_id": task.assignee_id,
        "position": task.position,
    }
