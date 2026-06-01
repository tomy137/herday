# SPDX-License-Identifier: AGPL-3.0-or-later
"""User routes: profile management and GDPR deletion."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Response, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user
from app.database import get_session
from app.models.cycle import Cycle
from app.models.event import Event
from app.models.journal import JournalEntry
from app.models.magic_link import MagicLinkToken
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


def _to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        locale=user.locale,
        transparency_status=user.transparency_status,
        transparency_accepted_at=user.transparency_accepted_at,
        created_at=user.created_at,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Return the current user's profile."""
    return _to_response(user)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    body: UserUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Update the current user's profile."""
    if body.locale is not None:
        user.locale = body.locale
    if body.transparency_status is not None:
        user.transparency_status = body.transparency_status
        # Stamp the acceptance the first time the user engages the pact.
        if body.transparency_status != "not_yet" and user.transparency_accepted_at is None:
            user.transparency_accepted_at = datetime.now(timezone.utc)
    user.updated_at = datetime.now(timezone.utc)

    session.add(user)
    await session.commit()
    await session.refresh(user)

    return _to_response(user)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_me(
    response: Response,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Delete the current user and ALL associated data (GDPR compliance).

    Cascade deletes: events, cycles, magic link tokens, then the user.
    """
    # Delete all user data
    for model in (Event, Cycle, JournalEntry, MagicLinkToken):
        if model == MagicLinkToken:
            stmt = select(model).where(model.email == user.email)
        else:
            stmt = select(model).where(model.user_id == user.id)
        result = await session.exec(stmt)
        for record in result.all():
            await session.delete(record)

    await session.delete(user)
    await session.commit()

    # Clear auth cookies
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
