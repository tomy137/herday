# SPDX-License-Identifier: AGPL-3.0-or-later
"""Beta tester sign-up (public /welcome page)."""

import uuid
from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class BetaSignup(SQLModel, table=True):
    """Someone who asked to test the app; one row per email (updated on re-submit)."""

    __tablename__ = "beta_signup"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    first_name: str = Field(max_length=80)
    email: str = Field(index=True, unique=True)
    platform: str = Field(max_length=10)  # ios | android
    source: str | None = Field(default=None, max_length=200)
    message: str | None = Field(default=None, max_length=1000)
    # Personal link to the APK: the download is only offered after signing up.
    download_token: str | None = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=_utcnow)
