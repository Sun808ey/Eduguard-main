from __future__ import annotations

import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, Optional

GENESIS_PREV_HASH = "0" * 64


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _json_payload(payload: Dict[str, Any]) -> str:
    return json.dumps(payload, separators=(",", ":"), sort_keys=True)


def _compute_event_hash(
    prev_hash: str,
    timestamp: str,
    event_type: str,
    device_id: Optional[str],
    payload_json: str,
) -> str:
    # FORENSIC ANNOTATION: Hash-chain construction binds the full event tuple to the previous row for tamper evidence.
    material = f"{prev_hash}|{timestamp}|{event_type}|{device_id or ''}|{payload_json}"
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


def append_event(
    conn: sqlite3.Connection,
    event_type: str,
    device_id: Optional[str],
    user_id: Optional[str],
    payload: dict,
) -> str:
    """
    FORENSIC ANNOTATION: Hash-chain construction
    Each entry: SHA-256( prev_hash || timestamp || event_type || device_id || payload_json )
    The GENESIS block uses prev_hash = '0' * 64 (64 zero chars)
    Tamper-evidence: any modification to any entry breaks all subsequent hashes.
    This is equivalent to a blockchain's block linkage but without consensus overhead.
    """
    timestamp = _utc_now().isoformat()
    payload_json = _json_payload(payload)

    prev_row = conn.execute(
        "SELECT event_hash FROM audit_log ORDER BY id DESC LIMIT 1"
    ).fetchone()
    prev_hash = prev_row["event_hash"] if prev_row else GENESIS_PREV_HASH

    # FORENSIC ANNOTATION: GENESIS uses a zeroed previous hash so the first record is deterministic and auditable.
    event_hash = _compute_event_hash(prev_hash, timestamp, event_type, device_id, payload_json)

    conn.execute(
        """
        INSERT INTO audit_log (prev_hash, event_hash, event_type, device_id, user_id, payload_json, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (prev_hash, event_hash, event_type, device_id, user_id, payload_json, timestamp),
    )
    return event_hash


def verify_chain(conn: sqlite3.Connection, from_id: int = 1, to_id: int = None) -> dict:
    """
    FORENSIC ANNOTATION: Full chain traversal
    Walk every row in order. Recompute each expected_hash from its prev_hash + fields.
    Compare to stored event_hash. First mismatch = tamper location.
    Returns { valid: bool, total: int, first_broken_id: int|None }
    """
    params = [from_id]
    query = """
        SELECT id, prev_hash, event_hash, event_type, device_id, payload_json, timestamp
        FROM audit_log
        WHERE id >= ?
    """
    if to_id is not None:
        query += " AND id <= ?"
        params.append(to_id)
    query += " ORDER BY id ASC"

    rows = conn.execute(query, params).fetchall()
    total = len(rows)
    seed_row = conn.execute(
        "SELECT event_hash FROM audit_log WHERE id < ? ORDER BY id DESC LIMIT 1",
        (from_id,),
    ).fetchone()
    previous_hash = seed_row["event_hash"] if seed_row else GENESIS_PREV_HASH
    first_broken_id = None

    for index, row in enumerate(rows):
        expected_prev_hash = previous_hash
        device_id = "" if row["device_id"] is None else str(row["device_id"])
        expected_hash = _compute_event_hash(
            expected_prev_hash,
            str(row["timestamp"]),
            str(row["event_type"]),
            device_id,
            str(row["payload_json"]),
        )
        stored_hash = str(row["event_hash"])
        if expected_hash != stored_hash or str(row["prev_hash"]) != expected_prev_hash:
            first_broken_id = int(row["id"])
            return {
                "valid": False,
                "total": total,
                "first_broken_id": first_broken_id,
            }
        previous_hash = stored_hash

    return {
        "valid": True,
        "total": total,
        "first_broken_id": None,
    }
