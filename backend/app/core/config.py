from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class AppSettings:
    secret_key: str
    jwt_secret: str
    database_url: str
    environment: str
    debug: bool

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in {"production", "render"}

    @property
    def vercel_env(self) -> str:
        return self.environment


def load_settings() -> AppSettings:
    environment = os.environ.get("APP_ENV") or os.environ.get("VERCEL_ENV") or os.environ.get("RENDER") or "development"
    debug_value = os.environ.get("FLASK_DEBUG", "").strip().lower()
    debug = debug_value in {"1", "true", "yes", "on"}
    return AppSettings(
        secret_key=os.environ.get("FLASK_SECRET_KEY") or ("dev-bootstrap-secret" if environment.lower() == "development" else ""),
        jwt_secret=os.environ.get("JWT_SECRET", ""),
        database_url=os.environ.get("DATABASE_URL", ""),
        environment=environment,
        debug=debug,
    )