"""
Agent 4 — Board Routes
CRUD operations for Kanban boards.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..schemas import BoardCreate, BoardUpdate, BoardResponse, PaginatedResponse

# These imports come from other agents' modules:
# Agent 1: Database models
# Agent 2: get_db session dependency
# Agent 3: get_current_user auth dependency
#
# We define stubs here so this module is self-documenting.
# At integration time, replace with actual imports:
#   from app.database import get_db
#   from app.models import Board, Column, Task, User, board_members
#   from app.auth import get_current_user


router = APIRouter(prefix="/boards", tags=["boards"])


# ── CREATE ─────────────────────────────────────────────

@router.post("/", response_model=BoardResponse, status_code=status.HTTP_201_CREATED)
async def create_board(
    board_in: BoardCreate,
    db: Session = Depends(),       # Depends(get_db)
    current_user=Depends(),        # Depends(get_current_user)
):
    """Create a new board. The authenticated user becomes the owner."""
    from app.models import Board, Column  # deferred import for integration

    board = Board(
        name=board_in.name,
        description=board_in.description,
        owner_id=current_user.id,
    )
    db.add(board)
    db.flush()

    # Create default columns for new boards
    default_columns = ["To Do", "In Progress", "Review", "Done"]
    for i, col_name in enumerate(default_columns):
        db.add(Column(board_id=board.id, name=col_name, position=i))

    db.commit()
    db.refresh(board)

    return _board_to_response(db, board)


# ── READ (list) ────────────────────────────────────────

@router.get("/", response_model=PaginatedResponse)
async def list_boards(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(),
    current_user=Depends(),
):
    """List all boards the current user owns or is a member of."""
    from app.models import Board, board_members

    query = (
        db.query(Board)
        .filter(
            (Board.owner_id == current_user.id)
            | (Board.id.in_(
                db.query(board_members.c.board_id)
                .filter(board_members.c.user_id == current_user.id)
            ))
        )
        .order_by(Board.updated_at.desc())
    )

    total = query.count()
    boards = query.offset((page - 1) * per_page).limit(per_page).all()

    return PaginatedResponse(
        items=[_board_to_response(db, b) for b in boards],
        total=total,
        page=page,
        per_page=per_page,
        pages=(total + per_page - 1) // per_page,
    )


# ── READ (single) ─────────────────────────────────────

@router.get("/{board_id}", response_model=BoardResponse)
async def get_board(
    board_id: int,
    db: Session = Depends(),
    current_user=Depends(),
):
    """Get a single board by ID."""
    board = _get_board_or_404(db, board_id, current_user)
    return _board_to_response(db, board)


# ── UPDATE ─────────────────────────────────────────────

@router.patch("/{board_id}", response_model=BoardResponse)
async def update_board(
    board_id: int,
    board_in: BoardUpdate,
    db: Session = Depends(),
    current_user=Depends(),
):
    """Update a board. Only the owner can update."""
    board = _get_board_or_404(db, board_id, current_user)

    if board.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the board owner can update it.",
        )

    update_data = board_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(board, field, value)

    db.commit()
    db.refresh(board)
    return _board_to_response(db, board)


# ── DELETE ─────────────────────────────────────────────

@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_board(
    board_id: int,
    db: Session = Depends(),
    current_user=Depends(),
):
    """Delete a board and all its columns/tasks. Owner only."""
    board = _get_board_or_404(db, board_id, current_user)

    if board.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the board owner can delete it.",
        )

    db.delete(board)  # cascade deletes columns & tasks
    db.commit()


# ── Members ────────────────────────────────────────────

@router.post("/{board_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def add_board_member(
    board_id: int,
    user_id: int,
    db: Session = Depends(),
    current_user=Depends(),
):
    """Add a member to a board. Owner only."""
    from app.models import board_members

    board = _get_board_or_404(db, board_id, current_user)
    if board.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Owner only.")

    db.execute(
        board_members.insert().values(board_id=board_id, user_id=user_id)
    )
    db.commit()


@router.delete("/{board_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_board_member(
    board_id: int,
    user_id: int,
    db: Session = Depends(),
    current_user=Depends(),
):
    """Remove a member from a board. Owner only."""
    from app.models import board_members

    board = _get_board_or_404(db, board_id, current_user)
    if board.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Owner only.")

    db.execute(
        board_members.delete().where(
            (board_members.c.board_id == board_id)
            & (board_members.c.user_id == user_id)
        )
    )
    db.commit()


# ── Helpers ────────────────────────────────────────────

def _get_board_or_404(db: Session, board_id: int, current_user) -> "Board":
    from app.models import Board, board_members

    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found.")

    # Check access: owner or member
    is_member = (
        db.query(board_members)
        .filter(
            board_members.c.board_id == board_id,
            board_members.c.user_id == current_user.id,
        )
        .first()
    )
    if board.owner_id != current_user.id and not is_member:
        raise HTTPException(status_code=404, detail="Board not found.")

    return board


def _board_to_response(db: Session, board) -> BoardResponse:
    from app.models import Column, Task

    col_count = db.query(func.count(Column.id)).filter(Column.board_id == board.id).scalar()
    task_count = db.query(func.count(Task.id)).filter(Task.board_id == board.id).scalar()

    return BoardResponse(
        id=board.id,
        name=board.name,
        description=board.description,
        owner_id=board.owner_id,
        created_at=board.created_at,
        updated_at=board.updated_at,
        column_count=col_count or 0,
        task_count=task_count or 0,
    )
