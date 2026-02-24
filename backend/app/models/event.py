# SPDX-License-Identifier: AGPL-3.0-or-later
"""Event database model."""

import uuid
from datetime import date, datetime, timezone

from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Event(SQLModel, table=True):
    """Cycle-related event recorded by the user."""

    __tablename__ = "event"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    event_type: str = Field(index=True)
    event_date: date
    metadata_json: str | None = Field(default=None)
    confidence: float = Field(default=1.0)
    created_at: datetime = Field(default_factory=_utcnow)
