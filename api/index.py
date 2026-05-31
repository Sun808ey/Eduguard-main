from __future__ import annotations

import sys
from pathlib import Path

from flask import Flask, jsonify

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from api.lib import auth_bp, policy_bp, sync_bp, users_bp  # noqa: E402


def create_app() -> Flask:
    app = Flask(__name__)
    app.register_blueprint(auth_bp)
    app.register_blueprint(policy_bp)
    app.register_blueprint(sync_bp)
    app.register_blueprint(users_bp)

    @app.get("/api/health")
    def health_check():
        return jsonify({"status": "ok"}), 200

    return app


app = create_app()
handler = app