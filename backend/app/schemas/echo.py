# SPDX-License-Identifier: AGPL-3.0-or-later
"""Échos (cross-cycle memory) response schemas."""

from datetime import date

from pydantic import BaseModel


class EchoOccurrence(BaseModel):
    """One past occurrence of the parent phase (grouped by cycle)."""

    cycle_start: date
    day_from: int  # first day-in-cycle of the parent phase that cycle (Jx)
    day_to: int    # last day-in-cycle (Jy)
    note: str | None = None  # a representative free_text from that occurrence


class FrequencyItem(BaseModel):
    """A pastille and how often it appeared at this parent phase."""

    pastille: str
    count: int
    total: int


class EchoResponse(BaseModel):
    """Aggregated cross-cycle memory for one parent phase."""

    parent_phase: str            # menstrual | follicular | ovulatory | luteal
    sub_phases: list[str]        # the sub-phases grouped under it
    history: list[EchoOccurrence]
    helpful: list[str]
    not_helpful: list[str]
    frequent: list[FrequencyItem]
