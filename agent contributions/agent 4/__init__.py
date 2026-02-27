"""
Agent 4 — Router Registration
Other agents (especially Agent 2) import this to mount all CRUD routes.

Usage (in Agent 2's main app setup):
    from agent4_task_routes import register_routes
    register_routes(app)
"""

from fastapi import FastAPI

from .routes.boards import router as boards_router
from .routes.columns import router as columns_router
from .routes.tasks import router as tasks_router


def register_routes(app: FastAPI, prefix: str = "/api/v1") -> None:
    """Mount all Agent 4 routers onto the FastAPI application."""
    app.include_router(boards_router, prefix=prefix)
    app.include_router(columns_router, prefix=prefix)
    app.include_router(tasks_router, prefix=prefix)
