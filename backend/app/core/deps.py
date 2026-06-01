# SPDX-License-Identifier: AGPL-3.0-or-later
"""FastAPI dependencies for authentication and authorization."""

import uuid

from fastapi import Cookie, Depends, Header, HTTPException, status
from jose import JWTError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.security import decode_token
from app.database import get_session
from app.models.user import User


async def get_current_user(
    access_token: str | None = Cookie(default=None),
    authorization: str | None = Header(default=None),
    session: AsyncSession = Depends(get_session),
) -> User:
    """Validate JWT from httpOnly cookie or Bearer header, return the current user.

    Web clients use the cookie path; Capacitor/native clients use Authorization: Bearer.
    Raises HTTP 401 if the token is missing, invalid, or the user does not exist.
    """
    # Bearer header takes precedence over cookie when both are present (explicit > implicit).
    if authorization and authorization.lower().startswith("bearer "):
        access_token = authorization.split(" ", 1)[1].strip()

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
