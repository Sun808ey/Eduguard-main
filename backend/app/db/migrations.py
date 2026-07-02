from __future__ import annotations

from typing import Any
import sqlite3
from typing import Optional

from .connection import get_connection


SQLITE_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN', 'ICT_TEACHER', 'CLASS_TEACHER')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_name TEXT NOT NULL,
    android_id TEXT NOT NULL UNIQUE,
    device_key_enc BLOB NOT NULL,
    public_key TEXT NOT NULL,
    enrolled_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_sync_at TEXT,
    is_revoked INTEGER NOT NULL DEFAULT 0 CHECK(is_revoked IN (0, 1))
);

CREATE TABLE IF NOT EXISTS policy_bundles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    version INTEGER NOT NULL,
    encrypted_payload BLOB NOT NULL,
    signature BLOB NOT NULL,
    iv BLOB NOT NULL,
    created_by INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS policy_assignments (
    device_id INTEGER NOT NULL,
    policy_id INTEGER NOT NULL,
    assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER NOT NULL,
    PRIMARY KEY (device_id, policy_id),
    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (policy_id) REFERENCES policy_bundles(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prev_hash TEXT NOT NULL,
    event_hash TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    device_id INTEGER,
    user_id INTEGER,
    payload_json TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS enrollment_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT NOT NULL UNIQUE,
    created_by INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    is_used INTEGER NOT NULL DEFAULT 0 CHECK(is_used IN (0, 1)),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    refresh_token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    revoked INTEGER NOT NULL DEFAULT 0 CHECK(revoked IN (0, 1)),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_devices_android_id ON devices(android_id);
CREATE INDEX IF NOT EXISTS idx_policy_bundles_active ON policy_bundles(is_active, created_at);
CREATE INDEX IF NOT EXISTS idx_policy_assignments_device ON policy_assignments(device_id);
CREATE INDEX IF NOT EXISTS idx_policy_assignments_policy ON policy_assignments(policy_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_device ON audit_log(device_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_tokens_expires ON enrollment_tokens(expires_at, is_used);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, revoked, expires_at);
"""

POSTGRES_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN', 'ICT_TEACHER', 'CLASS_TEACHER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS devices (
    id BIGSERIAL PRIMARY KEY,
    device_name TEXT NOT NULL,
    android_id TEXT NOT NULL UNIQUE,
    device_key_enc BYTEA NOT NULL,
    public_key TEXT NOT NULL,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_sync_at TIMESTAMPTZ,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS policy_bundles (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    version INTEGER NOT NULL,
    encrypted_payload BYTEA NOT NULL,
    signature BYTEA NOT NULL,
    iv BYTEA NOT NULL,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS policy_assignments (
    device_id BIGINT NOT NULL,
    policy_id BIGINT NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by BIGINT NOT NULL,
    PRIMARY KEY (device_id, policy_id),
    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (policy_id) REFERENCES policy_bundles(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    prev_hash TEXT NOT NULL,
    event_hash TEXT NOT NULL UNIQUE,
    event_type TEXT NOT NULL,
    device_id BIGINT,
    user_id BIGINT,
    payload_json TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS enrollment_tokens (
    id BIGSERIAL PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    created_by BIGINT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    refresh_token_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_devices_android_id ON devices(android_id);
CREATE INDEX IF NOT EXISTS idx_policy_bundles_active ON policy_bundles(is_active, created_at);
CREATE INDEX IF NOT EXISTS idx_policy_assignments_device ON policy_assignments(device_id);
CREATE INDEX IF NOT EXISTS idx_policy_assignments_policy ON policy_assignments(policy_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_device ON audit_log(device_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_tokens_expires ON enrollment_tokens(expires_at, is_used);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, revoked, expires_at);
"""

# FORENSIC ANNOTATION: The audit_log table stores prev_hash and event_hash so each event
# is cryptographically chained to the previous record, making tampering detectable.
# FORENSIC ANNOTATION: event_hash should be computed from prev_hash + timestamp + event_type
# + device_id + payload_json to provide immutable sequencing and integrity evidence.


def _is_postgres_connection(connection: Any) -> bool:
    return bool(getattr(connection, "_is_postgres", False))


def _run_sqlite_migrations(connection: sqlite3.Connection) -> None:
    with connection:
        connection.executescript(SQLITE_SCHEMA_SQL)


def _run_postgres_migrations(connection: Any) -> None:
    for statement in [statement.strip() for statement in POSTGRES_SCHEMA_SQL.split(";") if statement.strip()]:
        connection.execute(statement)


def run_migrations(connection: Any) -> None:
    """Apply schema and index migrations. Safe to run repeatedly."""
    if _is_postgres_connection(connection):
        _run_postgres_migrations(connection)
        return

    _run_sqlite_migrations(connection)


def migrate(db_path: Optional[str] = None) -> None:
    """Open a database connection and apply all idempotent migrations."""
    connection = get_connection(db_path)
    try:
        run_migrations(connection)
    finally:
        connection.close()
