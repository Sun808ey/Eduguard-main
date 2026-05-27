from __future__ import annotations

import hashlib
import json
import os
import sqlite3
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, Optional, Tuple, TypeVar

import jwt
from flask import jsonify, request, g
from jwt import ExpiredSignatureError, InvalidTokenError

from .audit_chain import append_event
from ..db.connection import get_connection

F = TypeVar("F", bound=Callable[..., Any])

ROLE_HIERARCHY = {
    "CLASS_TEACHER": 1,
    "ICT_TEACHER": 2,
    "SUPER_ADMIN": 3,
}

PUBLIC_KEY_ENV = "JWT_PUBLIC_KEY_PATH"

audit_event_type = "UNAUTHORIZED_ACCESS"


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _json_payload(payload: Dict[str, Any]) -> str:
    return json.dumps(payload, separators=(",", ":"), sort_keys=True)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _resolve_public_key_path() -> Path:
    return Path(os.environ.get(PUBLIC_KEY_ENV, "keys/server_public.pem"))


def _load_public_key() -> str:
    return _resolve_public_key_path().read_text(encoding="utf-8")


def _append_audit_log(
    connection: sqlite3.Connection,
    event_type: str,
    user_id: Optional[int],
    device_id: Optional[int],
    payload: Dict[str, Any],
) -> None:
    append_event(
        connection,
        event_type=event_type,
        device_id="" if device_id is None else str(device_id),
        user_id="" if user_id is None else str(user_id),
        payload=payload,
    )


def _log_unauthorized_access(
    user_id: Optional[int],
    role: Optional[str],
    required_roles: Iterable[str],
    reason: str,
) -> None:
    connection = get_connection()
    try:
        with connection:
            # FORENSIC ANNOTATION: Unauthorized access attempts are logged before the request is denied.
            _append_audit_log(
                connection,
                event_type=audit_event_type,
                user_id=user_id,
                device_id=None,
                payload={
                    "path": request.path,
                    "method": request.method,
                    "reason": reason,
                    "role": role,
                    "required_roles": list(required_roles),
                    "remote_addr": request.remote_addr,
                },
            )
    finally:
        connection.close()


def _decode_access_token(token: str) -> Dict[str, Any]:
    # FORENSIC ANNOTATION: Access tokens are validated against the RSA public key and must carry type=access.
    payload = jwt.decode(token, _load_public_key(), algorithms=["RS256"])
    if payload.get("type") != "access":
        raise InvalidTokenError("Invalid token type")
    return payload


def _role_rank(role: str) -> int:
    return ROLE_HIERARCHY.get(role, 0)


def require_role(*roles: str) -> Callable[[F], F]:
    """Require a JWT access token whose role meets or exceeds one of the allowed roles."""

    if not roles:
        raise ValueError("At least one role must be provided")

    allowed_roles = tuple(dict.fromkeys(roles))

    def decorator(func: F) -> F:
        @wraps(func)
        def wrapper(*args: Any, **kwargs: Any):
            auth_header = request.headers.get("Authorization", "").strip()
            if not auth_header.startswith("Bearer "):
                # FORENSIC ANNOTATION: Missing bearer token is treated as unauthenticated access.
                _log_unauthorized_access(None, None, allowed_roles, "missing_bearer_token")
                return jsonify({"error": "authorization bearer token required"}), 401

            token = auth_header.removeprefix("Bearer ").strip()
            try:
                payload = _decode_access_token(token)
            except ExpiredSignatureError:
                _log_unauthorized_access(None, None, allowed_roles, "expired_access_token")
                return jsonify({"error": "access token expired"}), 401
            except InvalidTokenError:
                _log_unauthorized_access(None, None, allowed_roles, "invalid_access_token")
                return jsonify({"error": "invalid access token"}), 401

            user_id = int(payload.get("sub", 0) or 0)
            role = str(payload.get("role", ""))

            # FORENSIC ANNOTATION: Role hierarchy enforces least privilege while still allowing higher-privilege admins to inherit access.
            required_role_ranks = [_role_rank(required_role) for required_role in allowed_roles]
            current_rank = _role_rank(role)
            authorized = any(current_rank >= required_rank and current_rank > 0 for required_rank in required_role_ranks)

            if not authorized:
                _log_unauthorized_access(user_id, role, allowed_roles, "insufficient_role")
                return jsonify({"error": "forbidden"}), 403

            connection = get_connection()
            try:
                user_row = connection.execute(
                    "SELECT id, username, role, is_active FROM users WHERE id = ?",
                    (user_id,),
                ).fetchone()
            finally:
                connection.close()

            if not user_row or int(user_row["is_active"]) == 0:
                _log_unauthorized_access(user_id, role, allowed_roles, "inactive_or_missing_user")
                return jsonify({"error": "forbidden"}), 403

            g.current_user = {
                "id": int(user_row["id"]),
                "username": user_row["username"],
                "role": user_row["role"],
            }
            g.jwt_payload = payload
            return func(*args, **kwargs)

        return wrapper  # type: ignore[return-value]

    return decorator
