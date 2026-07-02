from __future__ import annotations

import sqlite3
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = PROJECT_ROOT / "data" / "eduguard.db"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.db.migrations import run_migrations


def main() -> int:
    db_path = Path(DEFAULT_DB_PATH)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(str(db_path))
    connection.row_factory = sqlite3.Row
    try:
        run_migrations(connection)
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