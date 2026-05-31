from __future__ import annotations

import hashlib
import json
import sqlite3
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

import bcrypt
import jwt
from flask import Blueprint, jsonify, request
from jwt import ExpiredSignatureError, InvalidTokenError

from ..core.audit_chain import append_event
from ..core.key_material import load_key_material
from ..db.connection import get_connection

ACCESS_TOKEN_TTL_SECONDS = 15 * 60
REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60

PRIVATE_KEY_ENV = "JWT_PRIVATE_KEY_PATH"
PUBLIC_KEY_ENV = "JWT_PUBLIC_KEY_PATH"
PRIVATE_KEY_PEM_ENV = "JWT_PRIVATE_KEY_PEM"
PUBLIC_KEY_PEM_ENV = "JWT_PUBLIC_KEY_PEM"


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _load_jwt_keys() -> Tuple[str, str]:
    private_key = load_key_material(PRIVATE_KEY_PEM_ENV, PRIVATE_KEY_ENV, "keys/server_private.pem")
    public_key = load_key_material(PUBLIC_KEY_PEM_ENV, PUBLIC_KEY_ENV, "keys/server_public.pem")
    return private_key.decode("utf-8"), public_key.decode("utf-8")


def _hash_token(token: str) -> str:
    # FORENSIC ANNOTATION: Only SHA-256 token digests are persisted to prevent token replay from DB theft.
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _json_payload(payload: Dict[str, Any]) -> str:
    return json.dumps(payload, separators=(",", ":"), sort_keys=True)


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


def _create_session(
    connection: sqlite3.Connection,
    user_id: int,
    refresh_token: str,
    expires_at: datetime,
) -> None:
    # FORENSIC ANNOTATION: Persisting only refresh_token_hash limits credential exposure during forensic incidents.
    refresh_token_hash = _hash_token(refresh_token)
    connection.execute(
        """
        INSERT INTO sessions (user_id, refresh_token_hash, created_at, expires_at, revoked)
        VALUES (?, ?, ?, ?, 0)
        """,
        (
            user_id,
            refresh_token_hash,
            _utc_now().isoformat(),
            expires_at.isoformat(),
        ),
    )


def _issue_tokens(connection: sqlite3.Connection, user_id: int, role: str) -> Dict[str, Any]:
    private_key, _ = _load_jwt_keys()
    now = _utc_now()
    access_expires = now + timedelta(seconds=ACCESS_TOKEN_TTL_SECONDS)
    refresh_expires = now + timedelta(seconds=REFRESH_TOKEN_TTL_SECONDS)

    # FORENSIC ANNOTATION: Access token uses short TTL to reduce compromise blast radius.
    access_token = jwt.encode(
        {
            "sub": str(user_id),
            "role": role,
            "type": "access",
            "iat": int(now.timestamp()),
            "exp": int(access_expires.timestamp()),
            "jti": str(uuid.uuid4()),
        },
        private_key,
        algorithm="RS256",
    )

    # FORENSIC ANNOTATION: Refresh token has independent JTI for rotation and revocation tracking.
    refresh_token = jwt.encode(
        {
            "sub": str(user_id),
            "type": "refresh",
            "iat": int(now.timestamp()),
            "exp": int(refresh_expires.timestamp()),
            "jti": str(uuid.uuid4()),
        },
        private_key,
        algorithm="RS256",
    )

    _create_session(connection, user_id, refresh_token, refresh_expires)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": ACCESS_TOKEN_TTL_SECONDS,
    }


def _decode_refresh_token(refresh_token: str) -> Dict[str, Any]:
    _, public_key = _load_jwt_keys()
    # FORENSIC ANNOTATION: Refresh token signature and expiry are verified before any DB session checks.
    payload = jwt.decode(refresh_token, public_key, algorithms=["RS256"])
    if payload.get("type") != "refresh":
        raise InvalidTokenError("Invalid token type")
    return payload


def _get_active_user(connection: sqlite3.Connection, username: str) -> Optional[sqlite3.Row]:
    return connection.execute(
        """
        SELECT id, username, password_hash, role, is_active
        FROM users
        WHERE username = ? AND is_active = 1
        """,
        (username,),
    ).fetchone()


def _parse_iso8601(value: str) -> datetime:
    normalized = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


@auth_bp.post("/login")
def login() -> Tuple[Any, int] | Any:
    payload = request.get_json(silent=True) or {}
    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", ""))

    if not username or not password:
        return jsonify({"error": "username and password are required"}), 400

    connection = get_connection()
    try:
        user = _get_active_user(connection, username)

        valid_password = False
        if user is not None:
            # FORENSIC ANNOTATION: bcrypt.checkpw enforces secure password verification against stored salted hash.
            valid_password = bcrypt.checkpw(
                password.encode("utf-8"), user["password_hash"].encode("utf-8")
            )

        if not user or not valid_password:
            with connection:
                _append_audit_log(
                    connection,
                    event_type="LOGIN_FAILED",
                    user_id=user["id"] if user else None,
                    device_id=None,
                    payload={
                        "username": username,
                        "remote_addr": request.remote_addr,
                        "reason": "invalid_credentials",
                    },
                )
            return jsonify({"error": "invalid credentials"}), 401

        with connection:
            tokens = _issue_tokens(connection, int(user["id"]), str(user["role"]))
            _append_audit_log(
                connection,
                event_type="LOGIN_SUCCESS",
                user_id=int(user["id"]),
                device_id=None,
                payload={
                    "username": username,
                    "remote_addr": request.remote_addr,
                },
            )

        return (
            jsonify(
                {
                    "access_token": tokens["access_token"],
                    "refresh_token": tokens["refresh_token"],
                    "role": user["role"],
                    "expires_in": ACCESS_TOKEN_TTL_SECONDS,
                }
            ),
            200,
        )
    finally:
        connection.close()


@auth_bp.post("/refresh")
def refresh() -> Tuple[Any, int] | Any:
    payload = request.get_json(silent=True) or {}
    refresh_token = str(payload.get("refresh_token", "")).strip()
    if not refresh_token:
        return jsonify({"error": "refresh_token is required"}), 400

    try:
        decoded = _decode_refresh_token(refresh_token)
    except ExpiredSignatureError:
        return jsonify({"error": "refresh token expired"}), 401
    except InvalidTokenError:
        return jsonify({"error": "invalid refresh token"}), 401

    user_id = int(decoded["sub"])
    old_token_hash = _hash_token(refresh_token)

    connection = get_connection()
    try:
        session_row = connection.execute(
            """
            SELECT id, user_id, refresh_token_hash, expires_at, revoked
            FROM sessions
            WHERE refresh_token_hash = ?
            """,
            (old_token_hash,),
        ).fetchone()

        if not session_row or int(session_row["revoked"]) == 1:
            return jsonify({"error": "refresh token revoked"}), 401

        # FORENSIC ANNOTATION: Server-side session expiry check prevents replay using stale tokens.
        if _parse_iso8601(str(session_row["expires_at"])) <= _utc_now():
            with connection:
                connection.execute(
                    "UPDATE sessions SET revoked = 1 WHERE id = ?", (session_row["id"],)
                )
            return jsonify({"error": "refresh token expired"}), 401

        user_row = connection.execute(
            "SELECT id, role, is_active FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if not user_row or int(user_row["is_active"]) == 0:
            return jsonify({"error": "user inactive"}), 403

        with connection:
            # FORENSIC ANNOTATION: Refresh token rotation revokes old session before issuing replacement token.
            connection.execute(
                "UPDATE sessions SET revoked = 1 WHERE id = ?", (session_row["id"],)
            )
            new_tokens = _issue_tokens(connection, user_id=user_id, role=str(user_row["role"]))

        return jsonify({"access_token": new_tokens["access_token"], "refresh_token": new_tokens["refresh_token"], "expires_in": ACCESS_TOKEN_TTL_SECONDS}), 200
    finally:
        connection.close()


@auth_bp.post("/logout")
def logout() -> Tuple[Any, int] | Any:
    payload = request.get_json(silent=True) or {}
    refresh_token = str(payload.get("refresh_token", "")).strip()
    if not refresh_token:
        return jsonify({"error": "refresh_token is required"}), 400

    user_id: Optional[int] = None
    try:
        decoded = _decode_refresh_token(refresh_token)
        user_id = int(decoded["sub"])
    except InvalidTokenError:
        pass

    connection = get_connection()
    try:
        with connection:
            # FORENSIC ANNOTATION: Logout revokes hashed refresh token to terminate offline sessions reliably.
            connection.execute(
                "UPDATE sessions SET revoked = 1 WHERE refresh_token_hash = ?",
                (_hash_token(refresh_token),),
            )
            _append_audit_log(
                connection,
                event_type="LOGOUT",
                user_id=user_id,
                device_id=None,
                payload={
                    "remote_addr": request.remote_addr,
                },
            )

        return jsonify({"status": "logged_out"}), 200
    finally:
        connection.close()
