from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class AppSettings:
    secret_key: str
    jwt_secret: str
    database_url: str
    vercel_env: str


def load_settings() -> AppSettings:
    return AppSettings(
        secret_key=os.environ.get("FLASK_SECRET_KEY", "dev-bootstrap-secret"),
        jwt_secret=os.environ.get("JWT_SECRET", ""),
        database_url=os.environ.get("DATABASE_URL", ""),
        vercel_env=os.environ.get("VERCEL_ENV", "development"),
    )