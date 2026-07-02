from __future__ import annotations

import os

from flask import make_response, request
from flask_cors import CORS

ALLOWED_ORIGINS = [
    "https://eduguard-main.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
]

_extra = os.environ.get("EXTRA_CORS_ORIGINS", "")
if _extra:
    ALLOWED_ORIGINS.extend([origin.strip() for origin in _extra.split(",") if origin.strip()])


def init_cors(app):
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