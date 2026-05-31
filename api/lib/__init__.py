"""Shared Vercel-facing imports for the EduGuard backend."""

from .auth import auth_bp
from .audit import append_event, verify_chain
from .cors import ALLOWED_ORIGINS, init_cors, register_preflight_handler
from .env import load_local_env, required_env
from .errors import register_error_handlers
from .models import DEFAULT_DB_PATH, get_connection
from .policy import policy_bp, policies_bp
from .sync import sync_bp
from .users import users_bp

__all__ = [
    "ALLOWED_ORIGINS",
    "DEFAULT_DB_PATH",
    "append_event",
    "auth_bp",
    "load_local_env",
    "get_connection",
    "init_cors",
    "policies_bp",
    "policy_bp",
    "register_error_handlers",
    "register_preflight_handler",
    "required_env",
    "sync_bp",
    "users_bp",
    "verify_chain",
]