# SPDX-License-Identifier: AGPL-3.0-or-later
"""Beta sign-up schemas (public /welcome page)."""

from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class BetaSignupCreate(BaseModel):
    """Sign-up form. `website` is a honeypot: humans never see nor fill it."""

    first_name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    platform: Literal["ios", "android"]
    source: str | None = Field(default=None, max_length=200)
    message: str | None = Field(default=None, max_length=1000)
    website: str | None = None

    @field_validator("first_name")
    @classmethod
    def _strip_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("first_name must not be blank")
        return v

    @field_validator("source", "message")
    @classmethod
    def _blank_to_none(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip()
        return v or None


class BetaConfig(BaseModel):
    """What the /welcome page can offer right now (links only come with the sign-up)."""

    testflight_available: bool
    android_apk_available: bool


class BetaSignupResult(BaseModel):
    """Install links, given only once the form is filled."""

    detail: str
    download_url: str | None
    testflight_url: str | None
