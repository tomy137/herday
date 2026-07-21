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
    # Living calendar feed (iCal subscription). Token is None until the user
    # enables it; it is looked up on the unauthenticated feed path, hence indexed.
    calendar_feed_token: str | None = Field(default=None, index=True)
    calendar_feed_enabled: bool = Field(default=False)
    # "discreet" (neutral glyph, default for privacy) | "explicit" (clear labels)
    calendar_labels_mode: str = Field(default="discreet")
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)
