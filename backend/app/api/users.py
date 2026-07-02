from __future__ import annotations

import bcrypt
from flask import Blueprint, jsonify, request

from ..db.connection import get_connection
from ..core.rbac import require_role
from .auth import _append_audit_log

users_bp = Blueprint("users", __name__, url_prefix="/api/users")

# FORENSIC ANNOTATION: CLASS_TEACHER is intentionally excluded from user-management routes;
# that role only receives read-only access to assigned policies in the policy API.


def _serialize_user(row) -> dict:
    return {
        "id": row["id"],
        "username": row["username"],
        "role": row["role"],
        "created_at": row["created_at"],
        "is_active": bool(row["is_active"]),
    }


def _hash_password(password: str) -> str:
    # FORENSIC ANNOTATION: bcrypt with cost=12 balances password-hardening strength and laptop-class performance.
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


@users_bp.get("")
@require_role("SUPER_ADMIN")
def list_users():
    connection = get_connection()
    try:
        rows = connection.execute(
            """
            SELECT id, username, role, created_at, is_active
            FROM users
            ORDER BY id ASC
            """
        ).fetchall()
        return jsonify({"users": [_serialize_user(row) for row in rows]}), 200
    finally:
        connection.close()


@users_bp.post("")
@require_role("SUPER_ADMIN")
def create_user():
    payload = request.get_json(silent=True) or {}
    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", ""))
    role = str(payload.get("role", "")).strip()

    if not username or not password or not role:
        return jsonify({"error": "username, password, and role are required"}), 400

    if role not in {"SUPER_ADMIN", "ICT_TEACHER", "CLASS_TEACHER"}:
        return jsonify({"error": "invalid role"}), 400

    connection = get_connection()
    try:
        with connection:
            if getattr(connection, "_is_postgres", False):
                created_row = connection.execute(
                    """
                    INSERT INTO users (username, password_hash, role, created_at, is_active)
                    VALUES (%s, %s, %s, NOW(), TRUE)
                    RETURNING id
                    """,
                    (username, _hash_password(password), role),
                ).fetchone()
                created_id = int(created_row["id"])
            else:
                cursor = connection.execute(
                    """
                    INSERT INTO users (username, password_hash, role, created_at, is_active)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP, 1)
                    """,
                    (username, _hash_password(password), role),
                )
                created_id = int(cursor.lastrowid)

        created = connection.execute(
            """
            SELECT id, username, role, created_at, is_active
            FROM users
            WHERE id = ?
            """,
            (created_id,),
        ).fetchone()

        return jsonify({"user": _serialize_user(created)}), 201
    finally:
        connection.close()


@users_bp.put("/<int:user_id>")
@require_role("SUPER_ADMIN")
def update_user(user_id: int):
    payload = request.get_json(silent=True) or {}
    new_role = payload.get("role")
    new_password = payload.get("password")

    if new_role is None and new_password is None:
        return jsonify({"error": "role or password must be provided"}), 400

    if new_role is not None and str(new_role).strip() not in {"SUPER_ADMIN", "ICT_TEACHER", "CLASS_TEACHER"}:
        return jsonify({"error": "invalid role"}), 400

    connection = get_connection()
    try:
        existing = connection.execute(
            "SELECT id, username, role, created_at, is_active FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if not existing:
            return jsonify({"error": "user not found"}), 404

        updates = []
        params = []
        if new_role is not None:
            updates.append("role = ?")
            params.append(str(new_role).strip())
        if new_password is not None:
            updates.append("password_hash = ?")
            params.append(_hash_password(str(new_password)))

        params.append(user_id)
        with connection:
            connection.execute(
                f"UPDATE users SET {', '.join(updates)} WHERE id = ?",
                params,
            )

        updated = connection.execute(
            """
            SELECT id, username, role, created_at, is_active
            FROM users
            WHERE id = ?
            """,
            (user_id,),
        ).fetchone()

        return jsonify({"user": _serialize_user(updated)}), 200
    finally:
        connection.close()


@users_bp.delete("/<int:user_id>")
@require_role("SUPER_ADMIN")
def delete_user(user_id: int):
    connection = get_connection()
    try:
        existing = connection.execute(
            "SELECT id FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if not existing:
            return jsonify({"error": "user not found"}), 404

        with connection:
            connection.execute(
                "UPDATE users SET is_active = 0 WHERE id = ?",
                (user_id,),
            )

        return jsonify({"status": "deleted"}), 200
    finally:
        connection.close()
