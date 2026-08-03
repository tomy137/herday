# SPDX-License-Identifier: AGPL-3.0-or-later
"""Journal request/response schemas."""

from datetime import date, datetime

from pydantic import BaseModel, field_validator

from app.services.journal import PASTILLE_IDS

_MAX_FREE = 2000
_MAX_LOOP = 280


def _normalize(value: str | None) -> str | None:
    """Trim surrounding whitespace; whitespace-only text becomes ``None``."""
    if value is None:
        return None
    value = value.strip()
    return value or None


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
        value = _normalize(value)
        if value is not None and len(value) > _MAX_FREE:
            raise ValueError("error.text_too_long")
        return value

    @field_validator("helpful", "not_helpful")
    @classmethod
    def _cap_loop(cls, value: str | None) -> str | None:
        value = _normalize(value)
        if value is not None and len(value) > _MAX_LOOP:
            raise ValueError("error.text_too_long")
        return value

    @property
    def is_empty(self) -> bool:
        """True when the entry carries nothing worth remembering.

        Blank entries would otherwise surface as empty échos (a dated line with
        no content), so the router drops them instead of storing them.
        """
        return not (
            self.pastilles or self.free_text or self.helpful or self.not_helpful
        )


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
