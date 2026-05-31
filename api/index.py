from __future__ import annotations

import logging
import os
import sys

from flask import Flask, jsonify, request

API_DIR = os.path.dirname(__file__)
ROOT_DIR = os.path.dirname(API_DIR)

for path in (API_DIR, ROOT_DIR):
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