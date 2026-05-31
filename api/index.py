from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

from flask import Flask, abort, jsonify, request, send_from_directory
from werkzeug.exceptions import NotFound

API_DIR = Path(__file__).resolve().parent
ROOT_DIR = API_DIR.parent

for path in (str(API_DIR), str(ROOT_DIR)):
    if path not in sys.path:
        sys.path.insert(0, path)

from lib.audit import audit_request  # noqa: E402
from lib.cors import init_cors, register_preflight_handler  # noqa: E402
from lib.env import load_local_env, required_env  # noqa: E402
from lib.errors import register_error_handlers  # noqa: E402
from lib.auth import auth_bp, require_jwt  # noqa: E402
from lib.policy import policy_blueprint  # noqa: E402
from lib.sync import sync_bp  # noqa: E402
from lib.users import users_bp  # noqa: E402

load_local_env()

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
    response = send_from_directory(str(ROOT_DIR), filename)
    response.status_code = status_code
    return response


def _serve_frontend_path(requested_path: str):
    if requested_path.startswith("api/"):
        abort(404)

    candidate = ROOT_DIR / requested_path
    if candidate.is_file():
        return send_from_directory(str(ROOT_DIR), requested_path)

    if candidate.is_dir():
        index_file = candidate / "index.html"
        if index_file.is_file():
            return send_from_directory(str(candidate), "index.html")

    not_found_page = ROOT_DIR / "404.html"
    if not_found_page.is_file():
        return _send_frontend_file("404.html", 404)

    return jsonify({"error": "resource not found"}), 404

def create_app() -> Flask:
    app = Flask(__name__)
    app.config["SECRET_KEY"] = required_env("FLASK_SECRET_KEY")
    app.config["JWT_SECRET"] = required_env("JWT_SECRET")
    app.config["DATABASE_URL"] = required_env("DATABASE_URL")
    app.config["PROPAGATE_EXCEPTIONS"] = False

    app.register_blueprint(auth_bp)
    app.register_blueprint(policy_blueprint)
    app.register_blueprint(sync_bp)
    app.register_blueprint(users_bp)
    init_cors(app)
    register_preflight_handler(app)
    register_error_handlers(app)

    @app.before_request
    def _audit_request() -> None:
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

    @app.get("/404.html")
    def not_found_page():
        return _send_frontend_file("404.html", 404)

    @app.get("/assets/<path:asset_path>")
    def assets(asset_path: str):
        return send_from_directory(str(ROOT_DIR / "assets"), asset_path)

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
                    "env": os.environ.get("VERCEL_ENV", "development"),
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