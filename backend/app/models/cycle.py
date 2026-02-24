# SPDX-License-Identifier: AGPL-3.0-or-later
"""Cycle database model (deduced from events)."""

import uuid
from datetime import date, datetime, timezone

from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Cycle(SQLModel, table=True):
    """A menstrual cycle, either confirmed from events or inferred."""

    __tablename__ = "cycle"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    start_date: date
    end_date: date | None = Field(default=None)
    period_duration: int | None = Field(default=None)
    cycle_length: int | None = Field(default=None)
    source: str = Field(default="confirmed")  # "confirmed" or "inferred"
    confidence: float = Field(default=1.0)
    created_at: datetime = Field(default_factory=_utcnow)
