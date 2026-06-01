# SPDX-License-Identifier: AGPL-3.0-or-later
"""Phase and calendar response schemas."""

from datetime import date

from pydantic import BaseModel, field_validator


class PhaseOverrideRequest(BaseModel):
    """Body for setting a manual phase override on a date."""

    phase: str

    @field_validator("phase")
    @classmethod
    def _validate_phase(cls, value: str) -> str:
        from app.services.cycle_engine import Phase

        try:
            Phase(value)
        except ValueError:
            raise ValueError("error.invalid_phase")
        return value


class PhaseInfo(BaseModel):
    """Current phase information for a given date."""

    phase: str
    day_in_cycle: int
    cycle_length: int
    confidence: float
    system_state: str
    next_period_in: int | None
    phase_ends_in: int | None = None
    tips: list[str]
    # V2: parent grouping + manual override transparency
    parent_phase: str | None = None
    is_override: bool = False
    estimated_phase: str | None = None


class CalendarDay(BaseModel):
    """Phase and event info for a single calendar day."""

    date: date
    phase: str | None
    confidence: float
    events: list[str]
    day_in_cycle: int | None = None
    parent_phase: str | None = None
    is_override: bool = False


class CalendarMonth(BaseModel):
    """All days in a calendar month."""

    days: list[CalendarDay]
