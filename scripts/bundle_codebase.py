"""Bundle ArthNiti codebase into a clean zip file for Lovable and Claude Projects."""

import os
import zipfile
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
OUTPUT_ZIP = ROOT_DIR / "ArthNiti_v1.4_Final_Claude.zip"

EXCLUDE_DIRS = {
    "node_modules",
    "__pycache__",
    "dist",
    "build",
    ".git",
    ".venv",
    "venv",
    "env",
    ".gemini",
    ".idea",
    ".vscode",
    ".next",
    ".vite",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".agents",
    ".cursor",
    ".jetro",
    "brain",
    "__MACOSX",
}

EXCLUDE_EXTS = {
    ".pyc",
    ".pyo",
    ".zip",
    ".tar",
    ".gz",
    ".7z",
    ".log",
    ".db",
    ".sqlite",
    ".sqlite3",
    ".tsbuildinfo",
}

EXCLUDE_FILES = {
    ".env",
    ".DS_Store",
    "arthniti_lovable_claude.zip",
    "ArthNiti_v1.4_Final_Claude.zip",
    ".mcp.json",
    ".windsurfrules",
}


def create_bundle():
    print(f"Creating archive at: {OUTPUT_ZIP} ...")
    if OUTPUT_ZIP.exists():
        OUTPUT_ZIP.unlink()

    file_count = 0
    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(ROOT_DIR):
            # Prune excluded dirs in-place
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

            for file in files:
                ext = Path(file).suffix.lower()
                if ext in EXCLUDE_EXTS or file in EXCLUDE_FILES or file == OUTPUT_ZIP.name:
                    continue

                full_path = Path(root) / file
                rel_path = full_path.relative_to(ROOT_DIR)

                zf.write(full_path, arcname=rel_path)
                file_count += 1

    size_mb = OUTPUT_ZIP.stat().st_size / (1024 * 1024)
    print(f"Done! Successfully packed {file_count} files.")
    print(f"Archive size: {size_mb:.2f} MB")
    print(f"Location: {OUTPUT_ZIP}")


if __name__ == "__main__":
    create_bundle()
