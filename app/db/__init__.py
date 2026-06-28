"""Database utilities for EduGuard."""

from .connection import get_connection
from .migrations import migrate, run_migrations

__all__ = ["get_connection", "migrate", "run_migrations"]
