"""
Agent 4 — Column Routes
CRUD operations for board columns (the vertical lanes in a Kanban board).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..schemas import ColumnCreate, ColumnUpdate, ColumnResponse

router = APIRouter(prefix="/boards/{board_id}/columns", tags=["columns"])


@router.post("/", response_model=ColumnResponse, status_code=status.HTTP_201_CREATED)
async def create_column(
    board_id: int,
    col_in: ColumnCreate,
    db: Session = Depends(),
    current_user=Depends(),
):
    """Add a new column to a board."""
    from app.models import Column
    from .boards import _get_board_or_404

    board = _get_board_or_404(db, board_id, current_user)

    # Auto-assign position if not provided
    if col_in.position is None:
        max_pos = (
            db.query(Column.position)
            .filter(Column.board_id == board.id)
            .order_by(Column.position.desc())
            .first()
        )
        position = (max_pos[0] + 1) if max_pos else 0
    else:
        position = col_in.position
        # Shift existing columns to make room
        db.query(Column).filter(
            Column.board_id == board.id,
            Column.position >= position,
        ).update({Column.position: Column.position + 1})

    column = Column(board_id=board.id, name=col_in.name, position=position)
    db.add(column)
    db.commit()
    db.refresh(column)
    return column


@router.get("/", response_model=list[ColumnResponse])
async def list_columns(
    board_id: int,
    db: Session = Depends(),
    current_user=Depends(),
):
    """List all columns in a board, ordered by position."""
    from app.models import Column
    from .boards import _get_board_or_404

    _get_board_or_404(db, board_id, current_user)

    return (
        db.query(Column)
        .filter(Column.board_id == board_id)
        .order_by(Column.position)
        .all()
    )


@router.patch("/{column_id}", response_model=ColumnResponse)
async def update_column(
    board_id: int,
    column_id: int,
    col_in: ColumnUpdate,
    db: Session = Depends(),
    current_user=Depends(),
):
    """Update a column name or reorder it."""
    from app.models import Column
    from .boards import _get_board_or_404

    _get_board_or_404(db, board_id, current_user)
    column = _get_column_or_404(db, column_id, board_id)

    if col_in.name is not None:
        column.name = col_in.name

    if col_in.position is not None and col_in.position != column.position:
        _reorder_column(db, board_id, column, col_in.position)

    db.commit()
    db.refresh(column)
    return column


@router.delete("/{column_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_column(
    board_id: int,
    column_id: int,
    db: Session = Depends(),
    current_user=Depends(),
):
    """Delete a column. Tasks in it will be moved to the first remaining column."""
    from app.models import Column, Task
    from .boards import _get_board_or_404

    _get_board_or_404(db, board_id, current_user)
    column = _get_column_or_404(db, column_id, board_id)

    # Move orphaned tasks to first remaining column
    fallback = (
        db.query(Column)
        .filter(Column.board_id == board_id, Column.id != column_id)
        .order_by(Column.position)
        .first()
    )

    if fallback:
        db.query(Task).filter(Task.column_id == column_id).update(
            {Task.column_id: fallback.id}
        )

    db.delete(column)
    db.commit()


# ── Helpers ────────────────────────────────────────────

def _get_column_or_404(db, column_id: int, board_id: int):
    from app.models import Column

    column = (
        db.query(Column)
        .filter(Column.id == column_id, Column.board_id == board_id)
        .first()
    )
    if not column:
        raise HTTPException(status_code=404, detail="Column not found.")
    return column


def _reorder_column(db, board_id: int, column, new_position: int):
    from app.models import Column

    old_position = column.position

    if new_position > old_position:
        db.query(Column).filter(
            Column.board_id == board_id,
            Column.position > old_position,
            Column.position <= new_position,
        ).update({Column.position: Column.position - 1})
    else:
        db.query(Column).filter(
            Column.board_id == board_id,
            Column.position >= new_position,
            Column.position < old_position,
        ).update({Column.position: Column.position + 1})

    column.position = new_position
