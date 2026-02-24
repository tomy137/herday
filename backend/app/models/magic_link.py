# SPDX-License-Identifier: AGPL-3.0-or-later
"""Magic link token database model."""

import uuid
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class MagicLinkToken(SQLModel, table=True):
    """One-time magic link token for passwordless authentication."""

    __tablename__ = "magic_link_token"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(index=True)
    token: str = Field(unique=True, index=True)
    expires_at: datetime
    used: bool = Field(default=False)
    created_at: datetime = Field(default_factory=_utcnow)
