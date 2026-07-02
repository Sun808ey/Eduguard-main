from __future__ import annotations

import os
from typing import Iterable

from flask import make_response, request
from flask_cors import CORS

DEFAULT_ALLOWED_ORIGINS = [
    "https://eduguard-main.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
]

def _split_origins(value: str) -> list[str]:
    return [origin.strip() for origin in value.split(",") if origin.strip()]


def _dedupe(values: Iterable[str]) -> list[str]:
    seen = set()
    result = []
    for value in values:
        if value not in seen:
            seen.add(value)
            result.append(value)
    return result


ALLOWED_ORIGINS = _dedupe(
    DEFAULT_ALLOWED_ORIGINS
    + _split_origins(os.environ.get("CORS_ALLOWED_ORIGINS", ""))
    + _split_origins(os.environ.get("EXTRA_CORS_ORIGINS", ""))
)


def init_cors(app):
    if os.environ.get("APP_ENV", "").lower() in {"production", "render"} and "*" in ALLOWED_ORIGINS:
        raise RuntimeError("Wildcard CORS origins are not allowed in production")

    CORS(
        app,
        origins=ALLOWED_ORIGINS,
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=[
            "Content-Type",
            "Authorization",
            "X-Request-ID",
            "X-Device-ID",
            "X-Policy-Version",
        ],
        expose_headers=["X-Request-ID"],
        max_age=600,
    )
    return app


def register_preflight_handler(app):
    @app.route("/", defaults={"path": ""}, methods=["OPTIONS"])
    @app.route("/<path:path>", methods=["OPTIONS"])
    def options_preflight(path):
        response = make_response("", 204)
        origin = request.headers.get("Origin", "")
        if origin in ALLOWED_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = (
                "Content-Type, Authorization, X-Request-ID, X-Device-ID, X-Policy-Version"
            )
            response.headers["Access-Control-Max-Age"] = "600"
            response.headers["Vary"] = "Origin"
        return response

    return app