from __future__ import annotations

import os
import re
import sqlite3
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urlparse

DEFAULT_DB_PATH = Path(__file__).resolve().parents[2] / "data" / "eduguard.db"


def _normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgres://"):
        return "postgresql://" + database_url[len("postgres://"):]
    return database_url


def _is_postgres_url(database_url: str) -> bool:
    scheme = urlparse(database_url).scheme.lower()
    return scheme in {"postgres", "postgresql", "postgresql+psycopg2"}


def _sqlite_path_from_url(database_url: str) -> Path:
    parsed = urlparse(database_url)
    raw_path = f"{parsed.netloc}{parsed.path}" if parsed.netloc else parsed.path
    if raw_path.startswith("/") and not raw_path.startswith("//") and not raw_path[1:3].endswith(":/"):
        raw_path = raw_path.lstrip("/")
    return Path(raw_path)


def _open_sqlite_connection(target_path: Path) -> sqlite3.Connection:
    target_path.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(
        str(target_path),
        detect_types=sqlite3.PARSE_DECLTYPES,
        check_same_thread=False,
    )

    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode=WAL;")
    connection.execute("PRAGMA foreign_keys=ON;")
    connection.execute("PRAGMA synchronous=NORMAL;")

    return connection


class _PostgresCursorProxy:
    def __init__(self, cursor: Any):
        self._cursor = cursor

    def fetchone(self):
        return self._cursor.fetchone()

    def fetchall(self):
        return self._cursor.fetchall()

    def __getattr__(self, name: str):
        return getattr(self._cursor, name)


class PostgresConnectionProxy:
    _is_postgres = True

    def __init__(self, connection: Any):
        self._connection = connection

    @staticmethod
    def _normalize_sql(sql: str) -> str:
        return re.sub(r"\?", "%s", sql)

    def execute(self, sql: str, params: Any = None):
        try:
            from psycopg2.extras import RealDictCursor
        except ModuleNotFoundError as exc:  # pragma: no cover - exercised only when PostgreSQL is selected locally
            raise RuntimeError("psycopg2-binary is required for PostgreSQL connections") from exc

        cursor = self._connection.cursor(cursor_factory=RealDictCursor)
        cursor.execute(self._normalize_sql(sql), params or ())
        return _PostgresCursorProxy(cursor)

    def cursor(self, cursor_factory=None):
        try:
            from psycopg2.extras import RealDictCursor
        except ModuleNotFoundError as exc:  # pragma: no cover - exercised only when PostgreSQL is selected locally
            raise RuntimeError("psycopg2-binary is required for PostgreSQL connections") from exc

        if cursor_factory is None:
            cursor_factory = RealDictCursor
        return self._connection.cursor(cursor_factory=cursor_factory)

    def commit(self):
        return self._connection.commit()

    def rollback(self):
        return self._connection.rollback()

    def close(self):
        return self._connection.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        if exc_type is None:
            self.commit()
        else:
            self.rollback()
        return False


def get_connection(db_path: Optional[str] = None) -> sqlite3.Connection:
    """Create a database connection with secure defaults for offline sync workloads."""
    if db_path:
        if db_path.startswith(("postgres://", "postgresql://", "postgresql+psycopg2://")):
            database_url = _normalize_database_url(db_path)
        else:
            return _open_sqlite_connection(Path(db_path))
    else:
        database_url = _normalize_database_url(os.environ.get("DATABASE_URL", "").strip())

    if database_url and _is_postgres_url(database_url):
        try:
            import psycopg2
        except ModuleNotFoundError as exc:  # pragma: no cover - exercised only when PostgreSQL is selected locally
            raise RuntimeError("psycopg2-binary is required for PostgreSQL connections") from exc

        connection = psycopg2.connect(database_url)
        return PostgresConnectionProxy(connection)

    if db_path and db_path.startswith("sqlite:///"):
        return _open_sqlite_connection(_sqlite_path_from_url(db_path))

    if database_url and database_url.startswith("sqlite:///"):
        return _open_sqlite_connection(_sqlite_path_from_url(database_url))

    target_path = Path(db_path) if db_path else DEFAULT_DB_PATH
    return _open_sqlite_connection(target_path)
