# SPDX-License-Identifier: AGPL-3.0-or-later
"""Journal entry model — one daily observation per user per date."""

import uuid
from datetime import date, datetime, timezone

from sqlmodel import Field, SQLModel, UniqueConstraint


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class JournalEntry(SQLModel, table=True):
    """A single day's observation written by the user (the partner).

    One row per (user, entry_date) — upserted. ``pastilles_json`` holds a JSON
    list of pastille ids from the fixed catalogue (see services/journal.py).
    """

    __tablename__ = "journal_entry"
    __table_args__ = (
        UniqueConstraint("user_id", "entry_date", name="uq_journal_user_date"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    entry_date: date = Field(index=True)
    pastilles_json: str = Field(default="[]")
    free_text: str | None = Field(default=None)
    helpful: str | None = Field(default=None)
    not_helpful: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)
