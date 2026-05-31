from __future__ import annotations

from app.core.rbac import require_role

from app.api.auth import auth_bp


def require_jwt(*roles: str):
	return require_role(*roles)


__all__ = ["auth_bp", "require_jwt"]