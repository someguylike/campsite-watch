from __future__ import annotations

from pathlib import Path
import sqlite3


class StateStore:
    def __init__(self, path: str) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = sqlite3.connect(self.path)
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS checks (
                key TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                detail TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        self.conn.commit()

    def changed(self, key: str, status: str, detail: str) -> bool:
        row = self.conn.execute("SELECT status, detail FROM checks WHERE key = ?", (key,)).fetchone()
        if row == (status, detail):
            return False

        self.conn.execute(
            """
            INSERT INTO checks(key, status, detail, updated_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET
                status = excluded.status,
                detail = excluded.detail,
                updated_at = CURRENT_TIMESTAMP
            """,
            (key, status, detail),
        )
        self.conn.commit()
        return True

