from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB_PATH = PROJECT_ROOT / "data" / "eduguard.db"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.core.audit_chain import verify_chain


def _open_database(db_path: Path) -> sqlite3.Connection:
    connection = sqlite3.connect(str(db_path))
    connection.row_factory = sqlite3.Row
    return connection


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify EduGuard audit log chain integrity")
    parser.add_argument("--db", default=str(DEFAULT_DB_PATH), help="Path to the SQLite database")
    args = parser.parse_args()

    db_path = Path(args.db)
    if not db_path.exists():
        print(f"CHAIN BROKEN at entry ID 0 (database not found: {db_path})")
        return 1

    connection = _open_database(db_path)
    try:
        result = verify_chain(connection)
    finally:
        connection.close()

    if result["valid"]:
        print(f"CHAIN INTACT ({result['total']} entries)")
        return 0

    print(f"CHAIN BROKEN at entry ID {result['first_broken_id']}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
