from __future__ import annotations

import os
from pathlib import Path


def load_local_env() -> None:
    if os.environ.get("VERCEL_ENV") is None:
        from dotenv import load_dotenv

        load_dotenv(".env")
        load_dotenv(".env.local", override=True)


def load_key_material(env_name: str, path_env_name: str, default_path: str) -> bytes:
    inline_value = os.environ.get(env_name)
    if inline_value:
        return inline_value.encode("utf-8")

    key_path = Path(os.environ.get(path_env_name, default_path))
    return key_path.read_bytes()


def required_env(name: str) -> str:
    return os.environ[name]