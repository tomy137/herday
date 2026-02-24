# SPDX-License-Identifier: AGPL-3.0-or-later
"""Event request/response schemas."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel


class EventCreate(BaseModel):
    """Schema for creating a new event."""

    event_type: str
    event_date: date
    metadata: dict | None = None
    confidence: float = 1.0


class EventResponse(BaseModel):
    """Schema for returning an event."""

    id: uuid.UUID
    event_type: str
    event_date: date
    metadata: dict | None = None
    confidence: float
    created_at: datetime


class EventList(BaseModel):
    """Paginated list of events."""

    items: list[EventResponse]
    total: int
