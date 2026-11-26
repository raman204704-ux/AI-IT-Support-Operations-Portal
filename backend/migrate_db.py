"""
Database migration script: adds new columns required by the Django Admin panel update.
Run with: python migrate_db.py
"""
import sqlite3
import sys
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "it_support.db")


def column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    cols = [row[1] for row in cursor.fetchall()]
    return column in cols


def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}. Run the backend once first to create it.")
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    migrations = [
        ("users", "is_active", "INTEGER NOT NULL DEFAULT 1"),
        ("tickets", "assigned_to_admin_id", "INTEGER REFERENCES users(id) ON DELETE SET NULL"),
        ("tickets", "resolved_by_admin_id", "INTEGER REFERENCES users(id) ON DELETE SET NULL"),
        ("messages", "category", "TEXT"),
        ("messages", "ai_model", "TEXT"),
        ("messages", "suggest_ticket", "INTEGER NOT NULL DEFAULT 0"),
        ("conversations", "resolved_at", "DATETIME"),
    ]

    for table, col, col_def in migrations:
        if not column_exists(cur, table, col):
            print(f"  Adding column: {table}.{col}")
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}")
        else:
            print(f"  Skipping (exists): {table}.{col}")

    conn.commit()
    conn.close()
    print("\nMigration complete.")


if __name__ == "__main__":
    migrate()
