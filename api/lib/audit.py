from __future__ import annotations

import logging

from flask import request

from app.core.audit_chain import append_event, verify_chain

logger = logging.getLogger(__name__)


def audit_request() -> None:
	logger.info(
		"audit_request method=%s path=%s remote_addr=%s request_id=%s",
		request.method,
		request.path,
		request.headers.get("X-Forwarded-For", request.remote_addr),
		request.headers.get("X-Request-ID", ""),
	)


__all__ = ["append_event", "audit_request", "verify_chain"]