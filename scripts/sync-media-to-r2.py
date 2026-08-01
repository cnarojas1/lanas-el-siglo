#!/usr/bin/env python3
"""Sync local R2 media blobs to production R2 bucket for Lanas El Siglo.

Reads the local D1 'media' table and local R2 blob storage, then uploads
any missing files to the production R2 bucket via wrangler CLI.
"""

import sqlite3
import subprocess
import sys
import os
from pathlib import Path
from shutil import copy2

PROJECT_DIR = Path(__file__).resolve().parent.parent
STATE_DIR = PROJECT_DIR / ".wrangler" / "state" / "v3"
BUCKET = "lanas-el-siglo-media"
ACCOUNT_ID = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "f7f6884635183bbdf2c77577001262cb")


def find_d1_db() -> Path:
    """Find the local D1 sqlite database."""
    d1_dir = STATE_DIR / "d1" / "miniflare-D1DatabaseObject"
    for f in sorted(d1_dir.glob("*.sqlite"), key=lambda p: -p.stat().st_size):
        if f.stat().st_size > 50000:  # The real DB, not metadata
            return f
    raise FileNotFoundError(f"No D1 database found in {d1_dir}")


def find_r2_meta() -> Path:
    """Find the local R2 metadata sqlite."""
    r2_dir = STATE_DIR / "r2" / "miniflare-R2BucketObject"
    for f in sorted(r2_dir.glob("*.sqlite"), key=lambda p: -p.stat().st_size):
        if f.stat().st_size > 10000:
            return f
    raise FileNotFoundError(f"No R2 metadata found in {r2_dir}")


def upload_file(key: str, blob_path: Path, content_type: str) -> bool:
    """Upload a single file to production R2."""
    cmd = [
        "npx", "wrangler", "r2", "object", "put",
        f"{BUCKET}/{key}",
        "--file", str(blob_path),
        "--content-type", content_type,
        "--remote",
    ]
    env = {**os.environ, "CLOUDFLARE_ACCOUNT_ID": ACCOUNT_ID}
    if "CLOUDFLARE_API_TOKEN" in env:
        del env["CLOUDFLARE_API_TOKEN"]  # Force OAuth

    result = subprocess.run(cmd, capture_output=True, text=True, env=env, cwd=PROJECT_DIR)
    return result.returncode == 0


def main():
    d1_db = find_d1_db()
    r2_meta = find_r2_meta()

    print(f"D1 DB: {d1_db}")
    print(f"R2 meta: {r2_meta}")

    d1_conn = sqlite3.connect(str(d1_db))
    d1_conn.row_factory = sqlite3.Row
    r2_conn = sqlite3.connect(str(r2_meta))
    r2_conn.row_factory = sqlite3.Row

    # Get media records (skip logo)
    media = d1_conn.execute(
        "SELECT kv_key, filename, content_type FROM media WHERE kv_key NOT LIKE '%logo%'"
    ).fetchall()

    blob_dir = STATE_DIR / "r2" / BUCKET / "blobs"

    print(f"Found {len(media)} media records to sync")

    uploaded = 0
    skipped = 0

    for m in media:
        key = m["kv_key"]
        filename = m["filename"]
        content_type = m["content_type"] or "image/webp"

        # Find blob ID from R2 metadata
        blob_row = r2_conn.execute(
            "SELECT blob_id FROM _mf_objects WHERE key = ?", (key,)
        ).fetchone()

        if not blob_row:
            print(f"  ⚠️  No blob for {key}")
            skipped += 1
            continue

        blob_path = blob_dir / blob_row["blob_id"]
        if not blob_path.exists():
            print(f"  ⚠️  Blob file missing: {blob_path}")
            skipped += 1
            continue

        print(f"  Uploading {key} ({blob_path.stat().st_size} bytes)...", end=" ")
        if upload_file(key, blob_path, content_type):
            print("✅")
            uploaded += 1
        else:
            print("❌")
            skipped += 1

    d1_conn.close()
    r2_conn.close()

    print(f"\nDone: {uploaded} uploaded, {skipped} skipped")


if __name__ == "__main__":
    main()
