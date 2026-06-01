# SPDX-License-Identifier: AGPL-3.0-or-later
"""Authentication service: magic link generation and verification."""

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import settings
from app.models.magic_link import MagicLinkToken
from app.models.user import User


def _utcnow() -> datetime:
    """Return current UTC time as naive datetime (SQLite compatible)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def generate_magic_link(email: str, session: AsyncSession) -> str:
    """Generate a magic link token for the given email.

    Enforces rate limiting: max 3 tokens per 15 minutes per email.
    Returns the generated token string.
    """
    # Rate limit check: count tokens created in the last 15 minutes
    cutoff = _utcnow() - timedelta(minutes=15)
    statement = select(MagicLinkToken).where(
        MagicLinkToken.email == email,
        MagicLinkToken.created_at >= cutoff,
    )
    result = await session.exec(statement)
    recent_tokens = result.all()

    if len(recent_tokens) >= 3:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="error.rate_limit_exceeded",
        )

    # 6-digit numeric OTP. Scope to (email, token) for verification — collision risk at
    # HerDay scale is negligible (~3 unused codes/email max via rate limit).
    expires_at = _utcnow() + timedelta(
        minutes=settings.MAGIC_LINK_EXPIRE_MINUTES,
    )

    for _ in range(10):
        token = f"{secrets.randbelow(1_000_000):06d}"
        magic_link = MagicLinkToken(
            email=email,
            token=token,
            expires_at=expires_at,
        )
        session.add(magic_link)
        try:
            await session.commit()
            return token
        except Exception:
            await session.rollback()

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="error.code_generation_failed",
    )


async def verify_magic_link(
    token: str,
    email: str,
    session: AsyncSession,
) -> User:
    """Verify a magic link token and return (or create) the user.

    Marks the token as used. Creates the user account if it does not exist.
    """
    statement = select(MagicLinkToken).where(
        MagicLinkToken.token == token,
        MagicLinkToken.email == email,
    )
    result = await session.exec(statement)
    magic_link = result.first()

    if magic_link is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="error.invalid_magic_link",
        )

    if magic_link.used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="error.magic_link_already_used",
        )

    if magic_link.expires_at < _utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="error.magic_link_expired",
        )

    # Mark as used
    magic_link.used = True
    session.add(magic_link)

    # Find or create user
    user_statement = select(User).where(User.email == email)
    user_result = await session.exec(user_statement)
    user = user_result.first()

    if user is None:
        user = User(email=email)
        session.add(user)

    await session.commit()
    await session.refresh(user)

    return user
