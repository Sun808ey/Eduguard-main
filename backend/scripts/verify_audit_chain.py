from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.db.connection import get_connection
from app.core.audit_chain import verify_chain


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify EduGuard audit log chain integrity")
    parser.add_argument("--db", default="", help="Path to the SQLite database (optional; defaults to DATABASE_URL or local SQLite)")
    args = parser.parse_args()

    if args.db:
        db_path = Path(args.db)
        if not db_path.exists():
            print(f"CHAIN BROKEN at entry ID 0 (database not found: {db_path})")
            return 1
        connection = get_connection(str(db_path))
    else:
        connection = get_connection(os.environ.get("DATABASE_URL", "").strip() or None)

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
