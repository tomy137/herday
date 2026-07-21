# SPDX-License-Identifier: AGPL-3.0-or-later
"""Database engine and session management."""

from collections.abc import AsyncGenerator

from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)


# Columns added after the initial schema. ``create_all`` creates them on a
# fresh database but never ALTERs an existing table, so we add any missing
# ones idempotently at startup. (Lightweight stand-in for Alembic on an alpha
# DB; switch to proper migrations once a persistent schema must be versioned.)
_ADDED_COLUMNS: dict[str, list[tuple[str, str]]] = {
    "user": [
        ("transparency_status", "VARCHAR NOT NULL DEFAULT 'not_yet'"),
        ("transparency_accepted_at", "DATETIME"),
        ("posture_words_json", "VARCHAR"),
        ("calendar_feed_token", "VARCHAR"),
        ("calendar_feed_enabled", "BOOLEAN NOT NULL DEFAULT 0"),
        ("calendar_labels_mode", "VARCHAR NOT NULL DEFAULT 'discreet'"),
    ],
}


def _ensure_added_columns(sync_conn) -> None:
    inspector = inspect(sync_conn)
    tables = set(inspector.get_table_names())
    for table, columns in _ADDED_COLUMNS.items():
        if table not in tables:
            continue
        existing = {col["name"] for col in inspector.get_columns(table)}
        for name, ddl in columns:
            if name not in existing:
                sync_conn.exec_driver_sql(
                    f'ALTER TABLE "{table}" ADD COLUMN {name} {ddl}'
                )
    # The calendar feed token is looked up on the unauthenticated feed path, so
    # it needs an index. ``ALTER TABLE ADD COLUMN`` can't attach one on an
    # existing DB; ``create_all`` already made it on a fresh DB, so IF NOT
    # EXISTS turns this into a no-op there.
    if "user" in tables:
        sync_conn.exec_driver_sql(
            'CREATE INDEX IF NOT EXISTS ix_user_calendar_feed_token '
            'ON "user" (calendar_feed_token)'
        )


async def create_db_and_tables() -> None:
    """Create all database tables from SQLModel metadata, then backfill columns."""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        await conn.run_sync(_ensure_added_columns)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session."""
    async with AsyncSession(engine) as session:
        yield session
