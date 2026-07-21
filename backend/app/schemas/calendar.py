# SPDX-License-Identifier: AGPL-3.0-or-later
"""Calendar subscription request/response schemas."""

from pydantic import BaseModel, field_validator

LABELS_MODES = {"explicit", "discreet"}


class CalendarSubscription(BaseModel):
    """State of the user's living calendar feed.

    ``feed_url`` / ``webcal_url`` are only populated when the feed is enabled.
    """

    enabled: bool
    labels_mode: str
    feed_url: str | None = None
    webcal_url: str | None = None


class CalendarLabelsUpdate(BaseModel):
    """Change how the calendar events are labelled."""

    labels_mode: str

    @field_validator("labels_mode")
    @classmethod
    def _validate_mode(cls, value: str) -> str:
        if value not in LABELS_MODES:
            raise ValueError("error.invalid_labels_mode")
        return value
