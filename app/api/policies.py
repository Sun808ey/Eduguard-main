from __future__ import annotations

import base64
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from flask import Blueprint, jsonify, request, g

from ..core.crypto import (
    decrypt_policy_bundle,
    encrypt_policy_bundle,
    pack_encrypted_bundle,
    sign_bundle,
    unpack_encrypted_bundle,
    verify_bundle_signature,
)
from ..core.rbac import require_role
from ..db.connection import get_connection
from api.lib.env import load_key_material
from .auth import _append_audit_log

policies_bp = Blueprint("policies", __name__, url_prefix="/api/policies")

PRIVATE_KEY_ENV = "JWT_PRIVATE_KEY_PATH"
PUBLIC_KEY_ENV = "JWT_PUBLIC_KEY_PATH"
PRIVATE_KEY_PEM_ENV = "JWT_PRIVATE_KEY_PEM"
PUBLIC_KEY_PEM_ENV = "JWT_PUBLIC_KEY_PEM"


def _load_key_bytes(pem_env: str, path_env: str, default_path: str) -> bytes:
    return load_key_material(pem_env, path_env, default_path)


def _get_private_key_bytes() -> bytes:
    return _load_key_bytes(PRIVATE_KEY_PEM_ENV, PRIVATE_KEY_ENV, "keys/server_private.pem")


def _get_public_key_bytes() -> bytes:
    return _load_key_bytes(PUBLIC_KEY_PEM_ENV, PUBLIC_KEY_ENV, "keys/server_public.pem")


def _row_to_policy(row) -> dict:
    return {
        "id": row["id"],
        "title": row["title"],
        "version": row["version"],
        "created_by": row["created_by"],
        "created_at": row["created_at"],
        "is_active": bool(row["is_active"]),
    }


def _device_aes_key(device_row) -> bytes:
    # FORENSIC ANNOTATION: device_key_enc is treated as the device-specific AES material used to protect policy bundles.
    raw_value = device_row["device_key_enc"]
    if isinstance(raw_value, bytes):
        return raw_value
    if isinstance(raw_value, str):
        try:
            return base64.b64decode(raw_value.encode("ascii"))
        except Exception:
            return raw_value.encode("utf-8")
    raise TypeError("Unsupported device key format")


def _get_device(connection, device_id: int):
    return connection.execute(
        """
        SELECT id, device_name, android_id, device_key_enc, public_key, enrolled_at, last_sync_at, is_revoked
        FROM devices
        WHERE id = ? AND is_revoked = 0
        """,
        (device_id,),
    ).fetchone()


def _persist_policy_bundle(
    connection,
    title: str,
    version: int,
    payload_json: dict,
    device_row,
    created_by: int,
) -> int:
    device_key = _device_aes_key(device_row)
    encrypted = encrypt_policy_bundle(payload_json, device_key)
    encrypted_payload = pack_encrypted_bundle(encrypted)
    iv = base64.b64decode(encrypted["iv_b64"].encode("ascii"))

    # FORENSIC ANNOTATION: The encrypted payload is signed after encryption so the device can verify authenticity before use.
    signature_b64 = sign_bundle(encrypted_payload + iv, _get_private_key_bytes())
    with connection:
        cursor = connection.execute(
            """
            INSERT INTO policy_bundles (
                title, version, encrypted_payload, signature, iv, created_by, created_at, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
            """,
            (
                title,
                version,
                encrypted_payload,
                base64.b64decode(signature_b64.encode("ascii")),
                iv,
                created_by,
            ),
        )
    return int(cursor.lastrowid)


def _fetch_policy_bundle(connection, policy_id: int):
    return connection.execute(
        """
        SELECT id, title, version, encrypted_payload, signature, iv, created_by, created_at, is_active
        FROM policy_bundles
        WHERE id = ?
        """,
        (policy_id,),
    ).fetchone()


def _serialize_policy_detail(row, assigned_device_ids: List[int]) -> dict:
    encrypted_payload = row["encrypted_payload"]
    if isinstance(encrypted_payload, bytes):
        encrypted_payload = encrypted_payload.decode("utf-8")
    signature = row["signature"]
    if isinstance(signature, bytes):
        signature = base64.b64encode(signature).decode("ascii")
    iv = row["iv"]
    if isinstance(iv, bytes):
        iv = base64.b64encode(iv).decode("ascii")
    return {
        **_row_to_policy(row),
        "signature": signature,
        "iv_b64": iv,
        "encrypted_payload": json.loads(encrypted_payload),
        "assigned_device_ids": assigned_device_ids,
    }


def _policy_assignments_for_policy(connection, policy_id: int) -> List[int]:
    rows = connection.execute(
        "SELECT device_id FROM policy_assignments WHERE policy_id = ? ORDER BY device_id ASC",
        (policy_id,),
    ).fetchall()
    return [int(row["device_id"]) for row in rows]


@policies_bp.get("")
@require_role("SUPER_ADMIN", "ICT_TEACHER")
def list_policies():
    connection = get_connection()
    try:
        rows = connection.execute(
            """
            SELECT id, title, version, created_by, created_at, is_active
            FROM policy_bundles
            ORDER BY id DESC
            """
        ).fetchall()
        return jsonify({"policies": [_row_to_policy(row) for row in rows]}), 200
    finally:
        connection.close()


@policies_bp.get("/assigned")
@require_role("SUPER_ADMIN", "ICT_TEACHER", "CLASS_TEACHER")
def list_assigned_policies():
    device_id = request.args.get("device_id", type=int)
    if device_id is None:
        return jsonify({"error": "device_id is required"}), 400

    connection = get_connection()
    try:
        device = _get_device(connection, device_id)
        if not device:
            return jsonify({"error": "device not found"}), 404

        rows = connection.execute(
            """
            SELECT pb.id, pb.title, pb.version, pb.encrypted_payload, pb.signature, pb.iv,
                   pb.created_by, pb.created_at, pb.is_active
            FROM policy_bundles pb
            INNER JOIN policy_assignments pa ON pa.policy_id = pb.id
            WHERE pa.device_id = ?
            ORDER BY pb.version DESC, pb.id DESC
            """,
            (device_id,),
        ).fetchall()

        # FORENSIC ANNOTATION: CLASS_TEACHER can only read assigned policies through this read-only route; no write path is exposed.
        return jsonify({"device_id": device_id, "policies": [_serialize_policy_detail(row, [device_id]) for row in rows]}), 200
    finally:
        connection.close()


@policies_bp.get("/<int:policy_id>")
@require_role("SUPER_ADMIN", "ICT_TEACHER")
def get_policy(policy_id: int):
    connection = get_connection()
    try:
        row = _fetch_policy_bundle(connection, policy_id)
        if not row:
            return jsonify({"error": "policy not found"}), 404
        assigned_device_ids = _policy_assignments_for_policy(connection, policy_id)
        return jsonify({"policy": _serialize_policy_detail(row, assigned_device_ids)}), 200
    finally:
        connection.close()


@policies_bp.post("")
@require_role("SUPER_ADMIN", "ICT_TEACHER")
def create_policy():
    payload = request.get_json(silent=True) or {}
    title = str(payload.get("title", "")).strip()
    version = payload.get("version")
    policy_json = payload.get("policy_json")
    device_id = payload.get("device_id")

    if not title or version is None or policy_json is None or device_id is None:
        return jsonify({"error": "title, version, policy_json, and device_id are required"}), 400

    try:
        version_int = int(version)
        device_id_int = int(device_id)
    except (TypeError, ValueError):
        return jsonify({"error": "version and device_id must be integers"}), 400

    connection = get_connection()
    try:
        device = _get_device(connection, device_id_int)
        if not device:
            return jsonify({"error": "device not found"}), 404

        created_by = int(g.current_user["id"])
        policy_id = _persist_policy_bundle(connection, title, version_int, policy_json, device, created_by)
        with connection:
            connection.execute(
                """
                INSERT OR IGNORE INTO policy_assignments (device_id, policy_id, assigned_at, assigned_by)
                VALUES (?, ?, CURRENT_TIMESTAMP, ?)
                """,
                (device_id_int, policy_id, created_by),
            )
            _append_audit_log(
                connection,
                event_type="POLICY_CREATED",
                user_id=created_by,
                device_id=device_id_int,
                payload={"policy_id": policy_id, "title": title, "version": version_int},
            )

        row = _fetch_policy_bundle(connection, policy_id)
        return jsonify({"policy": _serialize_policy_detail(row, [device_id_int])}), 201
    finally:
        connection.close()


@policies_bp.put("/<int:policy_id>")
@require_role("SUPER_ADMIN", "ICT_TEACHER")
def update_policy(policy_id: int):
    payload = request.get_json(silent=True) or {}
    title = payload.get("title")
    version = payload.get("version")
    policy_json = payload.get("policy_json")
    device_id = payload.get("device_id")

    if title is None and version is None and policy_json is None and device_id is None:
        return jsonify({"error": "at least one field must be provided"}), 400

    connection = get_connection()
    try:
        row = _fetch_policy_bundle(connection, policy_id)
        if not row:
            return jsonify({"error": "policy not found"}), 404

        current_title = row["title"]
        current_version = int(row["version"])
        assigned_device_ids = _policy_assignments_for_policy(connection, policy_id)
        target_device_id = int(device_id) if device_id is not None else (assigned_device_ids[0] if assigned_device_ids else None)

        updated_title = str(title).strip() if title is not None else current_title
        updated_version = int(version) if version is not None else current_version

        with connection:
            if policy_json is not None:
                if target_device_id is None:
                    return jsonify({"error": "device_id is required to re-encrypt the policy"}), 400

                device = _get_device(connection, target_device_id)
                if not device:
                    return jsonify({"error": "device not found"}), 404

                # FORENSIC ANNOTATION: Fresh plaintext changes are re-encrypted against the target device key before persistence.
                encrypted = encrypt_policy_bundle(policy_json, _device_aes_key(device))
                encrypted_payload = pack_encrypted_bundle(encrypted)
                iv = base64.b64decode(encrypted["iv_b64"].encode("ascii"))
                signature_b64 = sign_bundle(encrypted_payload + iv, _get_private_key_bytes())
                connection.execute(
                    """
                    UPDATE policy_bundles
                    SET title = ?, version = ?, encrypted_payload = ?, signature = ?, iv = ?, is_active = 1
                    WHERE id = ?
                    """,
                    (
                        updated_title,
                        updated_version,
                        encrypted_payload,
                        base64.b64decode(signature_b64.encode("ascii")),
                        iv,
                        policy_id,
                    ),
                )
            else:
                connection.execute(
                    """
                    UPDATE policy_bundles
                    SET title = ?, version = ?, is_active = 1
                    WHERE id = ?
                    """,
                    (updated_title, updated_version, policy_id),
                )

            _append_audit_log(
                connection,
                event_type="POLICY_UPDATED",
                user_id=int(g.current_user["id"]),
                device_id=target_device_id,
                payload={"policy_id": policy_id, "title": updated_title, "version": updated_version},
            )

        updated_row = _fetch_policy_bundle(connection, policy_id)
        return jsonify({"policy": _serialize_policy_detail(updated_row, _policy_assignments_for_policy(connection, policy_id))}), 200
    finally:
        connection.close()


@policies_bp.delete("/<int:policy_id>")
@require_role("SUPER_ADMIN", "ICT_TEACHER")
def delete_policy(policy_id: int):
    connection = get_connection()
    try:
        row = _fetch_policy_bundle(connection, policy_id)
        if not row:
            return jsonify({"error": "policy not found"}), 404

        with connection:
            connection.execute(
                "UPDATE policy_bundles SET is_active = 0 WHERE id = ?",
                (policy_id,),
            )
            _append_audit_log(
                connection,
                event_type="POLICY_DELETED",
                user_id=int(g.current_user["id"]),
                device_id=None,
                payload={"policy_id": policy_id},
            )

        return jsonify({"status": "deleted"}), 200
    finally:
        connection.close()


@policies_bp.post("/<int:policy_id>/assign")
@require_role("SUPER_ADMIN", "ICT_TEACHER")
def assign_policy(policy_id: int):
    payload = request.get_json(silent=True) or {}
    device_id = payload.get("device_id")
    if device_id is None:
        return jsonify({"error": "device_id is required"}), 400

    try:
        device_id_int = int(device_id)
    except (TypeError, ValueError):
        return jsonify({"error": "device_id must be an integer"}), 400

    connection = get_connection()
    try:
        policy = _fetch_policy_bundle(connection, policy_id)
        device = _get_device(connection, device_id_int)
        if not policy:
            return jsonify({"error": "policy not found"}), 404
        if not device:
            return jsonify({"error": "device not found"}), 404

        # FORENSIC ANNOTATION: Assignment records are append-only evidence that a device received a specific policy bundle.
        with connection:
            connection.execute(
                """
                INSERT OR IGNORE INTO policy_assignments (device_id, policy_id, assigned_at, assigned_by)
                VALUES (?, ?, CURRENT_TIMESTAMP, ?)
                """,
                (device_id_int, policy_id, int(g.current_user["id"])),
            )
            _append_audit_log(
                connection,
                event_type="POLICY_ASSIGNED",
                user_id=int(g.current_user["id"]),
                device_id=device_id_int,
                payload={"policy_id": policy_id, "device_id": device_id_int},
            )

        return jsonify({"status": "assigned", "policy_id": policy_id, "device_id": device_id_int}), 200
    finally:
        connection.close()


@policies_bp.post("/<int:policy_id>/verify")
@require_role("SUPER_ADMIN", "ICT_TEACHER", "CLASS_TEACHER")
def verify_policy_signature(policy_id: int):
    connection = get_connection()
    try:
        row = _fetch_policy_bundle(connection, policy_id)
        if not row:
            return jsonify({"error": "policy not found"}), 404

        payload_bytes = row["encrypted_payload"] + row["iv"]
        is_valid = verify_bundle_signature(payload_bytes, base64.b64encode(row["signature"]).decode("ascii"), _get_public_key_bytes())
        return jsonify({"policy_id": policy_id, "signature_valid": is_valid}), 200
    finally:
        connection.close()
