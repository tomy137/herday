# SPDX-License-Identifier: AGPL-3.0-or-later
"""Authentication request/response schemas."""

from pydantic import BaseModel, EmailStr


class MagicLinkRequest(BaseModel):
    """Request to send a magic link email."""

    email: EmailStr


class VerifyRequest(BaseModel):
    """Request to verify a magic link token."""

    token: str
    email: str


class TokenResponse(BaseModel):
    """JWT token response."""

    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    """Optional body for refresh — used by native clients without cookies."""

    refresh_token: str | None = None
