from __future__ import annotations

import logging
import os
import traceback

from flask import g, jsonify

logger = logging.getLogger("eduguard.errors")


def register_error_handlers(app):
    is_dev = os.environ.get("APP_ENV", "development").lower() == "development"

    @app.errorhandler(Exception)
    def handle_generic(error):
        request_id = getattr(g, "request_id", "no-id")
        logger.error(
            "Unhandled exception [%s]: %s\n%s",
            request_id,
            str(error),
            traceback.format_exc(),
        )
        body = {"error": "internal server error", "ref": request_id}
        if is_dev:
            body["detail"] = str(error)
        return jsonify(body), 500

    @app.errorhandler(400)
    def bad_request(_error):
        return jsonify({"error": "bad request"}), 400

    @app.errorhandler(401)
    def unauthorised(_error):
        return jsonify({"error": "authentication required"}), 401

    @app.errorhandler(403)
    def forbidden(_error):
        return jsonify({"error": "access denied"}), 403

    return app