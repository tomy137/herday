# SPDX-License-Identifier: AGPL-3.0-or-later
"""FastAPI dependencies for authentication and authorization."""

import uuid

from fastapi import Cookie, Depends, HTTPException, status
from jose import JWTError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.security import decode_token
from app.database import get_session
from app.models.user import User


async def get_current_user(
    access_token: str | None = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
) -> User:
    """Extract and validate JWT from httpOnly cookie, return the current user.

    Raises HTTP 401 if the token is missing, invalid, or the user does not exist.
    """
    if access_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="error.not_authenticated",
        )

    try:
        payload = decode_token(access_token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="error.invalid_token",
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="error.invalid_token_type",
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="error.invalid_token",
        )

    try:
        uid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="error.invalid_token",
        )

    statement = select(User).where(User.id == uid)
    result = await session.exec(statement)
    user = result.first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="error.user_not_found",
        )

    return user
