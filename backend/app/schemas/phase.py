# SPDX-License-Identifier: AGPL-3.0-or-later
"""Phase and calendar response schemas."""

from datetime import date

from pydantic import BaseModel


class PhaseInfo(BaseModel):
    """Current phase information for a given date."""

    phase: str
    day_in_cycle: int
    cycle_length: int
    confidence: float
    system_state: str
    next_period_in: int | None
    tips: list[str]


class CalendarDay(BaseModel):
    """Phase and event info for a single calendar day."""

    date: date
    phase: str | None
    confidence: float
    events: list[str]


class CalendarMonth(BaseModel):
    """All days in a calendar month."""

    days: list[CalendarDay]
