# SPDX-License-Identifier: AGPL-3.0-or-later
"""User database model."""

import uuid
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    """User account."""

    __tablename__ = "user"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(unique=True, index=True)
    locale: str = Field(default="fr")
    # Transparency pact: not_yet | told_soon | told_already
    transparency_status: str = Field(default="not_yet")
    transparency_accepted_at: datetime | None = Field(default=None)
    # Personal posture words per parent phase (JSON map), filled in a later lot.
    posture_words_json: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)
