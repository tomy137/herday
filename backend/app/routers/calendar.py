# SPDX-License-Identifier: AGPL-3.0-or-later
"""Calendar routes: the public living iCal feed and its authenticated management."""

import secrets
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import settings
from app.core.deps import get_current_user
from app.database import get_session
from app.models.cycle import Cycle
from app.models.event import Event
from app.models.user import User
from app.schemas.calendar import CalendarLabelsUpdate, CalendarSubscription
from app.services.calendar_ics import compute_blocks, render_ics

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


def _host(request: Request) -> str:
    """Public origin used to build feed URLs (setting first, request host otherwise)."""
    if settings.PUBLIC_BASE_URL:
        return settings.PUBLIC_BASE_URL.rstrip("/")
    return str(request.base_url).rstrip("/")


def _subscription(user: User, request: Request) -> CalendarSubscription:
    feed_url: str | None = None
    webcal_url: str | None = None
    if user.calendar_feed_enabled and user.calendar_feed_token:
        base = _host(request)
        feed_url = f"{base}/api/calendar/{user.calendar_feed_token}.ics"
        # webcal:// swaps the scheme so calendar apps trigger the subscribe flow.
        webcal_url = "webcal://" + feed_url.split("://", 1)[-1]
    return CalendarSubscription(
        enabled=user.calendar_feed_enabled,
        labels_mode=user.calendar_labels_mode,
        feed_url=feed_url,
        webcal_url=webcal_url,
    )


async def _persist(user: User, session: AsyncSession) -> None:
    user.updated_at = datetime.now(timezone.utc)
    session.add(user)
    await session.commit()
    await session.refresh(user)


@router.get("/subscription", response_model=CalendarSubscription)
async def get_subscription(
    request: Request,
    user: User = Depends(get_current_user),
):
    """Return the current state of the user's calendar feed."""
    return _subscription(user, request)


@router.post("/subscription/enable", response_model=CalendarSubscription)
async def enable_subscription(
    request: Request,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Enable the feed, minting a secret token on first use."""
    if not user.calendar_feed_token:
        user.calendar_feed_token = secrets.token_urlsafe(32)
    user.calendar_feed_enabled = True
    await _persist(user, session)
    return _subscription(user, request)


@router.post("/subscription/rotate", response_model=CalendarSubscription)
async def rotate_subscription(
    request: Request,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Rotate the token — the previous URL stops working immediately (revocation)."""
    user.calendar_feed_token = secrets.token_urlsafe(32)
    user.calendar_feed_enabled = True
    await _persist(user, session)
    return _subscription(user, request)


@router.patch("/subscription", response_model=CalendarSubscription)
async def update_subscription(
    body: CalendarLabelsUpdate,
    request: Request,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Update the label style (explicit / discreet)."""
    user.calendar_labels_mode = body.labels_mode
    await _persist(user, session)
    return _subscription(user, request)


@router.delete("/subscription", response_model=CalendarSubscription)
async def disable_subscription(
    request: Request,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Disable the feed. The token is kept so re-enabling reuses the same URL."""
    user.calendar_feed_enabled = False
    await _persist(user, session)
    return _subscription(user, request)


@router.get("/{token}.ics")
async def get_feed(
    token: str,
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    """Public, unauthenticated iCal feed. Authorised solely by the URL token."""
    result = await session.exec(
        select(User).where(User.calendar_feed_token == token),
    )
    user = result.first()
    if user is None or not user.calendar_feed_enabled:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="error.calendar_feed_not_found",
        )

    cycles_result = await session.exec(
        select(Cycle)
        .where(Cycle.user_id == user.id)
        .order_by(Cycle.start_date),  # type: ignore[arg-type]
    )
    cycles = list(cycles_result.all())
    events_result = await session.exec(
        select(Event)
        .where(Event.user_id == user.id)
        .order_by(Event.event_date),  # type: ignore[arg-type]
    )
    events = list(events_result.all())

    today = date.today()
    now = datetime.now(timezone.utc)
    blocks = compute_blocks(cycles, events, today)
    body = render_ics(user, blocks, host=_host(request), now=now, today=today)

    return Response(
        content=body,
        media_type="text/calendar; charset=utf-8",
        headers={
            "Content-Disposition": 'inline; filename="herday.ics"',
            # Must be cacheable: Google's subscription fetcher (Google-Calendar-
            # Importer) fetches the feed but silently won't retain/display it when
            # told noindex/no-store, so those headers left the calendar empty in
            # Google (Apple and manual import were unaffected). Access control is
            # the unguessable URL token, not these headers.
            "Cache-Control": "public, max-age=3600",
        },
    )
