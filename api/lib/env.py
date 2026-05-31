from __future__ import annotations

import os


def load_local_env() -> None:
    if os.environ.get("VERCEL_ENV") is None:
        from dotenv import load_dotenv

        load_dotenv(".env.local")


def required_env(name: str) -> str:
    return os.environ[name]