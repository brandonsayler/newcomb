"""
Agent 4 — Pydantic Schemas
Request/response models for boards, columns, and tasks.
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


# ── Enums ──────────────────────────────────────────────

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"


# ── Board Schemas ──────────────────────────────────────

class BoardCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)

class BoardUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)

class BoardResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    owner_id: int
    created_at: datetime
    updated_at: datetime
    column_count: int = 0
    task_count: int = 0

    class Config:
        from_attributes = True


# ── Column Schemas ─────────────────────────────────────

class ColumnCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    position: Optional[int] = None

class ColumnUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    position: Optional[int] = None

class ColumnResponse(BaseModel):
    id: int
    board_id: int
    name: str
    position: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Task Schemas ───────────────────────────────────────

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = Field(None, max_length=10000)
    priority: TaskPriority = TaskPriority.MEDIUM
    assignee_id: Optional[int] = None
    due_date: Optional[datetime] = None
    labels: list[str] = Field(default_factory=list)
    column_id: Optional[int] = None
    position: Optional[int] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = Field(None, max_length=10000)
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    assignee_id: Optional[int] = None
    due_date: Optional[datetime] = None
    labels: Optional[list[str]] = None

class TaskMove(BaseModel):
    """Move a task to a different column and/or position."""
    column_id: int
    position: int

class TaskResponse(BaseModel):
    id: int
    board_id: int
    column_id: int
    title: str
    description: Optional[str]
    priority: TaskPriority
    status: TaskStatus
    creator_id: int
    assignee_id: Optional[int]
    due_date: Optional[datetime]
    labels: list[str]
    position: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Pagination ─────────────────────────────────────────

class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    per_page: int
    pages: int
