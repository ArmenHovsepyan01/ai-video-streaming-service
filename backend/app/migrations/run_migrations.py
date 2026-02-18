import sys
from pathlib import Path

import psycopg2

from app.core.config import settings

MIGRATIONS_DIR = Path(__file__).resolve().parent


def _ensure_schema_migrations_table(conn):
    with conn.cursor() as cursor:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMP DEFAULT NOW()
            );
            """
        )
    conn.commit()


def _get_applied_migrations(conn):
    with conn.cursor() as cursor:
        cursor.execute("SELECT filename FROM schema_migrations ORDER BY filename;")
        rows = cursor.fetchall()
    return {row[0] for row in rows}


def _apply_migration(conn, path):
    with open(path, "r", encoding="utf-8") as file:
        sql = file.read().strip()
    if not sql:
        return

    print(f"[migrations] Applying {path.name}...")
    with conn.cursor() as cursor:
        cursor.execute(sql)
        cursor.execute(
            "INSERT INTO schema_migrations (filename) VALUES (%s);",
            (path.name,),
        )
    conn.commit()
    print(f"[migrations] Applied {path.name}")


def run_migrations():
    print("[migrations] Starting migrations...")
    print(f"[migrations] Migrations dir: {MIGRATIONS_DIR}")
    try:
        conn = psycopg2.connect(settings.DATABASE_URL)
    except Exception as e:
        print(f"[migrations] Failed to connect to database: {e}")
        sys.exit(1)

    try:
        _ensure_schema_migrations_table(conn)
        applied = _get_applied_migrations(conn)
        migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
        print(f"[migrations] Found {len(migration_files)} migration file(s)")
        for migration in migration_files:
            if migration.name in applied:
                print(f"[migrations] Skipping {migration.name} (already applied)")
                continue
            _apply_migration(conn, migration)
        print("[migrations] Migrations complete")
    except Exception as e:
        print(f"[migrations] Error: {e}")
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    run_migrations()
