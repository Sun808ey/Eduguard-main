from __future__ import annotations

import json
import logging
import sys
import uuid
from datetime import datetime, timezone

from flask import g, request

from app.core.audit_chain import append_event, verify_chain

logger = logging.getLogger(__name__)


def audit_request() -> None:
	request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
	g.request_id = request_id

	forwarded_for = request.headers.get("X-Forwarded-For", "")
	client_ip = (
		forwarded_for.split(",")[0].strip()
		if forwarded_for
		else request.remote_addr
	)

	log_entry = {
		"ts": datetime.now(timezone.utc).isoformat(),
		"request_id": request_id,
		"method": request.method,
		"path": request.path,
		"query": request.query_string.decode("utf-8", errors="replace"),
		"client_ip": client_ip,
		"xff_chain": forwarded_for,
		"user_agent": request.headers.get("User-Agent", "unknown"),
		"device_id": request.headers.get("X-Device-ID", "none"),
		"origin": request.headers.get("Origin", "none"),
		"referer": request.headers.get("Referer", "none"),
	}

	logger.info("AUDIT %s", json.dumps(log_entry, separators=(",", ":"), sort_keys=True))
	print(
		f"[AUDIT] {log_entry['ts']} {client_ip} {request.method} {request.path}",
		flush=True,
		file=sys.stdout,
	)


__all__ = ["append_event", "audit_request", "verify_chain"]