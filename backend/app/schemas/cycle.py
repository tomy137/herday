# SPDX-License-Identifier: AGPL-3.0-or-later
"""Cycle response schemas."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel


class CycleResponse(BaseModel):
    """Schema for returning a cycle."""

    id: uuid.UUID
    start_date: date
    end_date: date | None
    period_duration: int | None
    cycle_length: int | None
    source: str
    confidence: float
    created_at: datetime
