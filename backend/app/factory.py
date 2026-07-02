from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

from flask import Flask, abort, jsonify, send_from_directory

from app.api import auth_bp, policies_bp, sync_bp, users_bp
from app.api.cors import init_cors, register_preflight_handler
from app.api.errors import register_error_handlers
from app.core import load_settings
from api.lib.audit import audit_request
from api.lib.env import load_local_env

API_DIR = Path(__file__).resolve().parent.parent / "api"
BACKEND_DIR = API_DIR.parent
PROJECT_DIR = BACKEND_DIR.parent
SYSTEM_DIR = PROJECT_DIR / "frontend"

for path in (str(API_DIR), str(BACKEND_DIR)):
    if path not in sys.path:
        sys.path.insert(0, path)

load_local_env()
settings = load_settings()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

SAMPLE_DATA_PAYLOAD = {
    "data": [
        {"id": 1, "name": "Sample Item 1", "value": 100},
        {"id": 2, "name": "Sample Item 2", "value": 200},
        {"id": 3, "name": "Sample Item 3", "value": 300},
    ],
    "timestamp": "2024-01-01T00:00:00Z",
    "total": 3,
}


def _send_frontend_file(filename: str, status_code: int = 200):
    response = send_from_directory(str(SYSTEM_DIR), filename)
    response.status_code = status_code
    return response


def _serve_frontend_path(requested_path: str):
    if requested_path.startswith("api/"):
        abort(404)

    candidate = SYSTEM_DIR / requested_path
    if candidate.is_file():
        return send_from_directory(str(SYSTEM_DIR), requested_path)

    if candidate.is_dir():
        index_file = candidate / "index.html"
        if index_file.is_file():
            return send_from_directory(str(candidate), "index.html")

    if (SYSTEM_DIR / "404.html").is_file():
        return _send_frontend_file("404.html", 404)

    return jsonify({"error": "resource not found"}), 404


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["SECRET_KEY"] = settings.secret_key
    app.config["JWT_SECRET"] = settings.jwt_secret
    app.config["DATABASE_URL"] = settings.database_url
    app.config["PROPAGATE_EXCEPTIONS"] = False

    app.register_blueprint(auth_bp)
    app.register_blueprint(policies_bp)
    app.register_blueprint(sync_bp)
    app.register_blueprint(users_bp)
    init_cors(app)
    register_preflight_handler(app)
    register_error_handlers(app)

    @app.before_request
    def _audit_request_wrapper() -> None:
        audit_request()

    @app.get("/")
    def root():
        return _send_frontend_file("index.html")

    @app.get("/index.html")
    def legacy_index():
        return _send_frontend_file("index.html")

    @app.get("/dashboard.html")
    def dashboard_page():
        return _send_frontend_file("dashboard.html")

    @app.get("/dashboard")
    def dashboard_clean_url():
        return _send_frontend_file("dashboard.html")

    @app.get("/login.html")
    @app.get("/login")
    def login_page():
        return _send_frontend_file("login.html")

    @app.get("/404.html")
    def not_found_page():
        return _send_frontend_file("404.html", 404)

    @app.get("/assets/<path:asset_path>")
    def assets(asset_path: str):
        candidate = SYSTEM_DIR / "assets" / asset_path
        if candidate.is_file():
            return send_from_directory(str(SYSTEM_DIR / "assets"), asset_path)
        abort(404)

    @app.get("/<path:requested_path>")
    def frontend_or_static(requested_path: str):
        return _serve_frontend_path(requested_path)

    @app.get("/api/health")
    @app.get("/api/data")
    def health_check():
        return (
            jsonify(
                {
                    "status": "ok",
                    "service": "EduGuard Policy API",
                    "version": "1.0.0",
                    "env": settings.vercel_env,
                }
            ),
            200,
        )

    @app.get("/api/sample-data")
    def sample_data():
        return jsonify(SAMPLE_DATA_PAYLOAD), 200

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify({"error": "resource not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(_error):
        return jsonify({"error": "method not allowed"}), 405

    @app.errorhandler(500)
    def internal_error(_error):
        logger.exception("Unhandled 500 — see Vercel runtime logs")
        return jsonify({"error": "internal server error"}), 500

    return app


app = create_app()
handler = app