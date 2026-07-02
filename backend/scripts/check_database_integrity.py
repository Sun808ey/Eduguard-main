from __future__ import annotations

import os
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.db.connection import get_connection
from app.db.migrations import run_migrations


def main() -> int:
    database_url = os.environ.get("DATABASE_URL", "").strip()
    connection = get_connection(database_url or None)
    try:
        run_migrations(connection)
        if getattr(connection, "_is_postgres", False):
            required_tables = ["users", "devices", "policy_bundles", "policy_assignments", "audit_log", "enrollment_tokens", "sessions"]
            rows = connection.execute(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = ANY(%s)
                ORDER BY table_name ASC
                """,
                (required_tables,),
            ).fetchall()
            integrity = "ok" if len(rows) == len(required_tables) else "missing_tables"
        else:
            connection.execute("PRAGMA foreign_key_check;")
            integrity = connection.execute("PRAGMA integrity_check;").fetchone()[0]
    finally:
        connection.close()

    if integrity != "ok":
        print(f"Database integrity check failed: {integrity}")
        return 1

    print("Database integrity check passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())