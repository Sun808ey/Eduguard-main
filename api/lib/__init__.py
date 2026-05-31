"""Shared Vercel-facing imports for the EduGuard backend."""

from .auth import auth_bp
from .audit import append_event, verify_chain
from .cors import ALLOWED_ORIGINS, init_cors, register_preflight_handler
from .models import DEFAULT_DB_PATH, get_connection
from .policy import policy_bp, policies_bp
from .sync import sync_bp
from .users import users_bp

__all__ = [
    "ALLOWED_ORIGINS",
    "DEFAULT_DB_PATH",
    "append_event",
    "auth_bp",
    "get_connection",
    "init_cors",
    "policies_bp",
    "policy_bp",
    "register_preflight_handler",
    "sync_bp",
    "users_bp",
    "verify_chain",
]