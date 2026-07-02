from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def _human_size(num_bytes: int) -> str:
    units = ["B", "K", "M", "G", "T"]
    size = float(num_bytes)
    for unit in units:
        if size < 1024.0 or unit == units[-1]:
            return f"{size:.1f}{unit}" if unit != "B" else f"{int(size)}B"
        size /= 1024.0
    return f"{size:.1f}T"


def _directory_size(path: Path) -> int:
    total = 0
    for item in path.rglob("*"):
        if item.is_file():
            try:
                total += item.stat().st_size
            except OSError:
                continue
    return total


def _top_level_sizes(path: Path) -> list[tuple[int, Path]]:
    entries: list[tuple[int, Path]] = []
    for child in path.iterdir():
        if child.is_file():
            entries.append((child.stat().st_size, child))
        elif child.is_dir():
            entries.append((_directory_size(child), child))
    return sorted(entries, key=lambda item: item[0], reverse=True)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Install requirements into a temporary folder and audit Vercel bundle size."
    )
    parser.add_argument("--requirements", default="requirements.txt", help="Path to requirements.txt")
    parser.add_argument(
        "--limit-mb",
        type=float,
        default=200.0,
        help="Fail if the installed bundle exceeds this many MiB (default: 200)",
    )
    args = parser.parse_args()

    requirements_path = Path(args.requirements).resolve()
    if not requirements_path.exists():
        print(f"Requirements file not found: {requirements_path}", file=sys.stderr)
        return 2

    with tempfile.TemporaryDirectory(prefix="vercel_size_check_") as temp_dir:
        target_dir = Path(temp_dir)
        command = [
            sys.executable,
            "-m",
            "pip",
            "install",
            "-r",
            str(requirements_path),
            "--target",
            str(target_dir),
            "-q",
        ]
        result = subprocess.run(command, check=False)
        if result.returncode != 0:
            print("pip install failed while auditing bundle size.", file=sys.stderr)
            return result.returncode

        total_bytes = _directory_size(target_dir)
        limit_bytes = int(args.limit_mb * 1024 * 1024)

        print(f"Installed bundle size: {_human_size(total_bytes)}")
        print(f"Limit: {_human_size(limit_bytes)}")
        print("Heaviest top-level packages:")
        for size_bytes, child in _top_level_sizes(target_dir)[:20]:
            print(f"{_human_size(size_bytes):>8}  {child.name}")

        if total_bytes > limit_bytes:
            print(
                f"Bundle size exceeds the {args.limit_mb:.0f} MiB audit threshold.",
                file=sys.stderr,
            )
            return 1

        return 0


if __name__ == "__main__":
    raise SystemExit(main())