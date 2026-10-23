# SPDX-License-Identifier: AGPL-3.0-or-later
"""User request/response schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator


TRANSPARENCY_STATUSES = {"not_yet", "told_soon", "told_already"}
PRONOUNS = {"elle", "il", "iel"}
EXPERTISE_LEVELS = {"decouverte", "bases", "expert"}
CONTRACEPTION_VALUES = {"non", "oui", "inconnu"}
NICKNAME_MAX_LENGTH = 40


class UserResponse(BaseModel):
    """Schema for returning user profile."""

    id: uuid.UUID
    email: str
    locale: str
    transparency_status: str
    transparency_accepted_at: datetime | None = None
    partner_nickname: str | None = None
    partner_pronouns: str = "elle"
    expertise_level: str | None = None
    contraception: str | None = None
    created_at: datetime


class UserUpdate(BaseModel):
    """Schema for updating user profile.

    ``partner_nickname`` accepts an empty string to clear it.
    """

    locale: str | None = None
    transparency_status: str | None = None
    partner_nickname: str | None = None
    partner_pronouns: str | None = None
    expertise_level: str | None = None
    contraception: str | None = None

    @field_validator("transparency_status")
    @classmethod
    def _validate_transparency(cls, value: str | None) -> str | None:
        if value is not None and value not in TRANSPARENCY_STATUSES:
            raise ValueError("error.invalid_transparency_status")
        return value

    @field_validator("partner_nickname")
    @classmethod
    def _validate_nickname(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if len(value) > NICKNAME_MAX_LENGTH:
            raise ValueError("error.nickname_too_long")
        return value

    @field_validator("partner_pronouns")
    @classmethod
    def _validate_pronouns(cls, value: str | None) -> str | None:
        if value is not None and value not in PRONOUNS:
            raise ValueError("error.invalid_pronouns")
        return value

    @field_validator("expertise_level")
    @classmethod
    def _validate_expertise(cls, value: str | None) -> str | None:
        if value is not None and value not in EXPERTISE_LEVELS:
            raise ValueError("error.invalid_expertise_level")
        return value

    @field_validator("contraception")
    @classmethod
    def _validate_contraception(cls, value: str | None) -> str | None:
        if value is not None and value not in CONTRACEPTION_VALUES:
            raise ValueError("error.invalid_contraception")
        return value
