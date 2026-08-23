#!/usr/bin/env python3
"""One-shot importer: migrate the legacy single-user muse.db into a v1-saas
user account (the owner). Run ONCE against the production DB volume:

    ADMIN_EMAIL=you@example.com MUSE_DB_PATH=/data/muse.db python3 scripts/import_legacy.py

Rows whose user_id IS NULL are pre-multi-user data. When legacy and target are
the same file (in-place adoption) they are simply re-assigned to the owner.
Idempotent: re-running is a no-op.
"""
import os
import sqlite3
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
LEGACY_DB = Path(os.environ.get("LEGACY_DB_PATH", REPO / "muse.db"))
TARGET_DB = Path(os.environ.get("MUSE_DB_PATH", REPO / "muse.db"))
OWNER_EMAIL = os.environ.get("ADMIN_EMAIL", "").strip().lower()

TABLES = ["inspirations", "creator_profile", "evolution_records", "content_calendar", "user_skills"]


def main():
    if not OWNER_EMAIL:
        sys.exit("Set ADMIN_EMAIL to the owner account that inherits the legacy data")
    if not LEGACY_DB.exists():
        sys.exit(f"Legacy DB not found: {LEGACY_DB}")

    tgt = sqlite3.connect(str(TARGET_DB), timeout=10)
    tgt.row_factory = sqlite3.Row
    owner = tgt.execute("SELECT id FROM users WHERE email = ?", (OWNER_EMAIL,)).fetchone()
    if not owner:
        sys.exit(f"Owner {OWNER_EMAIL} not found in target DB — create it first "
                 "(start the server once with ADMIN_EMAIL/ADMIN_PASSWORD set)")
    uid = owner["id"]

    src = tgt if LEGACY_DB.resolve() == TARGET_DB.resolve() else sqlite3.connect(str(LEGACY_DB), timeout=10)
    src.row_factory = sqlite3.Row

    total = 0
    for table in TABLES:
        try:
            legacy_count = src.execute(f"SELECT COUNT(*) FROM {table} WHERE user_id IS NULL").fetchone()[0]
        except sqlite3.OperationalError:
            print(f"- {table}: not present in legacy DB, skipped")
            continue
        if legacy_count == 0:
            print(f"- {table}: nothing to import")
            continue

        if src is tgt:
            tgt.execute(f"UPDATE {table} SET user_id = ? WHERE user_id IS NULL", (uid,))
        else:
            cols = [r[1] for r in src.execute(f"PRAGMA table_info({table})")]
            shared = [c for c in cols if c != "id"]
            placeholders = ", ".join("?" for _ in shared)
            rows = src.execute(
                f"SELECT {', '.join(shared)} FROM {table} WHERE user_id IS NULL"
            ).fetchall()
            for r in rows:
                vals = [uid if c == "user_id" else r[c] for c in shared]
                tgt.execute(
                    f"INSERT INTO {table} ({', '.join(shared)}) VALUES ({placeholders})",
                    vals
                )
        print(f"- {table}: adopted {legacy_count} rows into {OWNER_EMAIL}")
        total += legacy_count

    tgt.commit()
    if src is not tgt:
        src.close()
    tgt.close()
    print(f"Done — {total} legacy rows now owned by {OWNER_EMAIL}")


if __name__ == "__main__":
    main()
