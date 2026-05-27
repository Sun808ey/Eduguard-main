from __future__ import annotations

from flask import Blueprint, jsonify, request

from ..core.sync_engine import build_pull_response, process_push_payload

sync_bp = Blueprint("sync", __name__, url_prefix="/api/sync")


@sync_bp.get("/pull")
def pull_sync():
    device_id = request.args.get("device_id", type=int)
    last_sync_at = request.args.get("last_sync_at", default="", type=str)
    hmac_sig = request.args.get("hmac_sig", default="", type=str).strip() or request.headers.get(
        "X-Device-Signature", ""
    ).strip()

    if device_id is None:
        return jsonify({"error": "device_id is required"}), 400
    if not hmac_sig:
        return jsonify({"error": "hmac signature is required"}), 400

    response, status_code = build_pull_response(device_id, last_sync_at, hmac_sig)
    return jsonify(response), status_code


@sync_bp.post("/push")
def push_sync():
    payload = request.get_json(silent=True) or {}
    hmac_sig = str(payload.get("hmac_sig", "")).strip() or request.headers.get(
        "X-Device-Signature", ""
    ).strip()

    if not hmac_sig:
        return jsonify({"error": "hmac signature is required"}), 400

    response, status_code = process_push_payload(payload, hmac_sig)
    return jsonify(response), status_code
