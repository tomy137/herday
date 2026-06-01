# SPDX-License-Identifier: AGPL-3.0-or-later
"""Journal request/response schemas."""

from datetime import date, datetime

from pydantic import BaseModel, field_validator

from app.services.journal import PASTILLE_IDS

_MAX_FREE = 2000
_MAX_LOOP = 280


class JournalUpsert(BaseModel):
    """Schema for creating/updating a daily journal entry."""

    pastilles: list[str] = []
    free_text: str | None = None
    helpful: str | None = None
    not_helpful: str | None = None

    @field_validator("pastilles")
    @classmethod
    def _validate_pastilles(cls, value: list[str]) -> list[str]:
        # Deduplicate while preserving order, reject unknown ids.
        seen: list[str] = []
        for pid in value:
            if pid not in PASTILLE_IDS:
                raise ValueError("error.invalid_pastille")
            if pid not in seen:
                seen.append(pid)
        return seen

    @field_validator("free_text")
    @classmethod
    def _cap_free(cls, value: str | None) -> str | None:
        if value is not None and len(value) > _MAX_FREE:
            raise ValueError("error.text_too_long")
        return value

    @field_validator("helpful", "not_helpful")
    @classmethod
    def _cap_loop(cls, value: str | None) -> str | None:
        if value is not None and len(value) > _MAX_LOOP:
            raise ValueError("error.text_too_long")
        return value


class JournalResponse(BaseModel):
    """Schema for returning a journal entry."""

    entry_date: date
    pastilles: list[str]
    free_text: str | None
    helpful: str | None
    not_helpful: str | None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class JournalList(BaseModel):
    """Paginated list of journal entries."""

    items: list[JournalResponse]
    total: int
