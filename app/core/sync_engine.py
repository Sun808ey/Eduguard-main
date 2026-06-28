from __future__ import annotations

import base64
import hashlib
import hmac
import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

from .audit_chain import append_event
from ..db.connection import get_connection


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _iso_utc_now() -> str:
    return _utc_now().isoformat().replace("+00:00", "Z")


def _canonical_json(data: Dict[str, Any]) -> bytes:
    return json.dumps(data, separators=(",", ":"), sort_keys=True).encode("utf-8")


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _parse_iso8601(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    normalized = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _device_row(connection, device_id: int):
    return connection.execute(
        """
        SELECT id, device_name, android_id, device_key_enc, public_key, enrolled_at, last_sync_at, is_revoked
        FROM devices
        WHERE id = ? AND is_revoked = 0
        """,
        (device_id,),
    ).fetchone()


def _device_aes_key_from_row(device_row) -> bytes:
    # FORENSIC ANNOTATION: The device AES key is reused as the HMAC secret for device-bound sync authentication.
    raw_value = device_row["device_key_enc"]
    if isinstance(raw_value, bytes):
        return raw_value
    if isinstance(raw_value, str):
        try:
            return base64.b64decode(raw_value.encode("ascii"))
        except Exception:
            return raw_value.encode("utf-8")
    raise TypeError("Unsupported device key format")


def _latest_assigned_policy(connection, device_id: int):
    # FORENSIC ANNOTATION: Server-wins policy resolution always returns the latest active assigned bundle for the device.
    return connection.execute(
        """
        SELECT pb.id, pb.title, pb.version, pb.encrypted_payload, pb.signature, pb.iv,
               pb.created_by, pb.created_at, pb.is_active
        FROM policy_bundles pb
        INNER JOIN policy_assignments pa ON pa.policy_id = pb.id
        WHERE pa.device_id = ? AND pb.is_active = 1
        ORDER BY pb.version DESC, pb.id DESC
        LIMIT 1
        """,
        (device_id,),
    ).fetchone()


def _policy_signature_b64(policy_row) -> str:
    signature = policy_row["signature"]
    if isinstance(signature, bytes):
        return base64.b64encode(signature).decode("ascii")
    return str(signature)


def _policy_bundle_payload(policy_row) -> dict:
    encrypted_payload = policy_row["encrypted_payload"]
    if isinstance(encrypted_payload, bytes):
        encrypted_payload = encrypted_payload.decode("utf-8")
    iv = policy_row["iv"]
    if isinstance(iv, bytes):
        iv_b64 = base64.b64encode(iv).decode("ascii")
    else:
        iv_b64 = str(iv)
    encrypted = json.loads(encrypted_payload)
    encrypted["iv_b64"] = iv_b64
    # FORENSIC ANNOTATION: Policy response carries the encrypted bundle and RSA signature for device-side verification before enforcement.
    return {
        "ciphertext_b64": encrypted["ciphertext_b64"],
        "iv_b64": encrypted["iv_b64"],
        "tag_b64": encrypted["tag_b64"],
        "signature_b64": _policy_signature_b64(policy_row),
    }


def build_pull_response(
    device_id: int,
    last_sync_at: Optional[str],
    hmac_sig: str,
    request_path: str = "/api/sync/pull",
) -> Tuple[Dict[str, Any], int]:
    connection = get_connection()
    try:
        device = _device_row(connection, device_id)
        if not device:
            return {"error": "device not found"}, 404

        # FORENSIC ANNOTATION: HMAC verification occurs before any sync state is revealed or modified.
        if not verify_sync_signature(
            device,
            {
                "device_id": device_id,
                "last_sync_at": last_sync_at or "",
                "path": request_path,
                "method": "GET",
            },
            hmac_sig,
        ):
            return {"error": "invalid signature"}, 401

        last_sync_dt = _parse_iso8601(last_sync_at)
        policy_row = _latest_assigned_policy(connection, device_id)
        if not policy_row:
            return {
                "has_update": False,
                "server_time": _iso_utc_now(),
            }, 200

        # FORENSIC ANNOTATION: Timestamp conflicts are resolved against the server_time returned on the previous pull.
        policy_created = _parse_iso8601(str(policy_row["created_at"]))
        if last_sync_dt is not None and policy_created is not None and policy_created <= last_sync_dt:
            return {
                "has_update": False,
                "server_time": _iso_utc_now(),
            }, 200

        return {
            "policy_bundle": _policy_bundle_payload(policy_row),
            "policy_version": int(policy_row["version"]),
            "server_time": _iso_utc_now(),
            "has_update": True,
        }, 200
    finally:
        connection.close()


def verify_sync_signature(device_row, payload: Dict[str, Any], hmac_sig: str) -> bool:
    # FORENSIC ANNOTATION: The device AES key doubles as the HMAC secret for offline request authentication.
    secret = _device_aes_key_from_row(device_row)
    computed = hmac.new(secret, _canonical_json(payload), hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed, hmac_sig)


def _append_device_event(connection, device_id: int, event: Dict[str, Any]) -> None:
    # FORENSIC ANNOTATION: DEVICE WINS for audit events means every tablet-originated event is appended to the chain.
    event_type = str(event.get("event_type", "DEVICE_EVENT"))
    payload = {"event": event, "source": "device"}
    append_event(connection, event_type=event_type, device_id=str(device_id), user_id=None, payload=payload)


def process_push_payload(payload: Dict[str, Any], hmac_sig: str) -> Tuple[Dict[str, Any], int]:
    device_id = payload.get("device_id")
    events = payload.get("events", [])
    if device_id is None:
        return {"error": "device_id is required"}, 400

    try:
        device_id_int = int(device_id)
    except (TypeError, ValueError):
        return {"error": "device_id must be an integer"}, 400

    connection = get_connection()
    try:
        device = _device_row(connection, device_id_int)
        if not device:
            return {"error": "device not found"}, 404

        # FORENSIC ANNOTATION: Push HMAC is verified before processing any event to prevent forged audit records.
        canonical = {
            "device_id": device_id_int,
            "events": events,
        }
        if not verify_sync_signature(device, canonical, hmac_sig):
            return {"error": "invalid signature"}, 401

        accepted = 0
        with connection:
            for event in events:
                normalized_event = event if isinstance(event, dict) else {"event_type": "DEVICE_EVENT", "value": event}
                _append_device_event(connection, device_id_int, normalized_event)
                accepted += 1

            # FORENSIC ANNOTATION: last_sync_at records the server-side completion time of the latest accepted sync.
            connection.execute(
                "UPDATE devices SET last_sync_at = ? WHERE id = ?",
                (_iso_utc_now(), device_id_int),
            )

        return {
            "accepted": accepted,
            "rejected": 0,
            "server_time": _iso_utc_now(),
        }, 200
    finally:
        connection.close()
