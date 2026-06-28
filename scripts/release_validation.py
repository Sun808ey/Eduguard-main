from __future__ import annotations

import subprocess
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def _run(command: list[str]) -> int:
    result = subprocess.run(command, cwd=PROJECT_ROOT, check=False)
    return result.returncode


def main() -> int:
    python_executable = sys.executable

    checks = [
        [python_executable, "-m", "pytest", "tests/test_core_security.py", "tests/test_smoke.py", "tests/test_key_loading.py"],
        [python_executable, "scripts/verify_audit_chain.py"],
    ]

    for command in checks:
        exit_code = _run(command)
        if exit_code != 0:
            return exit_code

    return 0


if __name__ == "__main__":
    raise SystemExit(main())