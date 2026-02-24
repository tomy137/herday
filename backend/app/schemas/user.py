# SPDX-License-Identifier: AGPL-3.0-or-later
"""User request/response schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel


class UserResponse(BaseModel):
    """Schema for returning user profile."""

    id: uuid.UUID
    email: str
    partner_name: str | None
    locale: str
    created_at: datetime


class UserUpdate(BaseModel):
    """Schema for updating user profile."""

    partner_name: str | None = None
    locale: str | None = None
