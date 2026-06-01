# SPDX-License-Identifier: AGPL-3.0-or-later
"""User request/response schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator


TRANSPARENCY_STATUSES = {"not_yet", "told_soon", "told_already"}


class UserResponse(BaseModel):
    """Schema for returning user profile."""

    id: uuid.UUID
    email: str
    partner_name: str | None
    locale: str
    transparency_status: str
    transparency_accepted_at: datetime | None = None
    created_at: datetime


class UserUpdate(BaseModel):
    """Schema for updating user profile."""

    partner_name: str | None = None
    locale: str | None = None
    transparency_status: str | None = None

    @field_validator("transparency_status")
    @classmethod
    def _validate_transparency(cls, value: str | None) -> str | None:
        if value is not None and value not in TRANSPARENCY_STATUSES:
            raise ValueError("error.invalid_transparency_status")
        return value
