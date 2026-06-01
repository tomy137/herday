# SPDX-License-Identifier: AGPL-3.0-or-later
"""Phase override model — a user's manual correction of the estimated phase."""

import uuid
from datetime import date, datetime, timezone

from sqlmodel import Field, SQLModel, UniqueConstraint


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class PhaseOverride(SQLModel, table=True):
    """A journalled manual correction of the estimated sub-phase for a date.

    The override is a *display* correction read by the cycle engine; it never
    feeds ``recalculate_cycles`` (that would risk shifting the cycles). One row
    per (user, override_date), upserted; ``created_at`` records when chosen.
    """

    __tablename__ = "phase_override"
    __table_args__ = (
        UniqueConstraint("user_id", "override_date", name="uq_override_user_date"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    override_date: date = Field(index=True)
    phase: str  # a Phase enum value (sub-phase), validated at the router
    created_at: datetime = Field(default_factory=_utcnow)
