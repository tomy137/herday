# SPDX-License-Identifier: AGPL-3.0-or-later
"""Phase routes: current phase, calendar projections, and manual overrides."""

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user
from app.database import get_session
from app.models.cycle import Cycle
from app.models.event import Event
from app.models.phase_override import PhaseOverride
from app.models.user import User
from app.schemas.phase import CalendarMonth, PhaseInfo, PhaseOverrideRequest
from app.services.cycle_engine import (
    calculate_calendar_month,
    calculate_phase,
    load_overrides,
)

router = APIRouter(prefix="/api/phases", tags=["phases"])


async def _get_override(user_id, override_date: date, session: AsyncSession):
    result = await session.exec(
        select(PhaseOverride).where(
            PhaseOverride.user_id == user_id,
            PhaseOverride.override_date == override_date,
        ),
    )
    return result.first()


@router.get("/today", response_model=PhaseInfo)
async def get_today_phase(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get the phase information for today (honouring any manual override)."""
    cycles_result = await session.exec(
        select(Cycle)
        .where(Cycle.user_id == user.id)
        .order_by(Cycle.start_date),  # type: ignore[arg-type]
    )
    cycles = cycles_result.all()

    events_result = await session.exec(
        select(Event)
        .where(Event.user_id == user.id)
        .order_by(Event.event_date),  # type: ignore[arg-type]
    )
    events = events_result.all()

    overrides = await load_overrides(user.id, session)
    info = calculate_phase(date.today(), list(cycles), list(events), overrides)
    return PhaseInfo(**info)


@router.get("/calendar", response_model=CalendarMonth)
async def get_calendar(
    month: str = Query(
        ...,
        description="Month in YYYY-MM format",
        pattern=r"^\d{4}-\d{2}$",
    ),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get phase and event data for each day of a given month."""
    try:
        year, month_num = month.split("-")
        year_int = int(year)
        month_int = int(month_num)
        if not (1 <= month_int <= 12):
            raise ValueError
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="error.invalid_month_format",
        )

    days = await calculate_calendar_month(year_int, month_int, user.id, session)
    return CalendarMonth(days=days)


@router.put("/override/{override_date}", response_model=PhaseInfo)
async def set_override(
    override_date: date,
    body: PhaseOverrideRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Set (or replace) the manual phase override for a date, then return the
    recomputed phase info for today."""
    now = datetime.now(timezone.utc)
    existing = await _get_override(user.id, override_date, session)
    if existing is None:
        existing = PhaseOverride(
            user_id=user.id,
            override_date=override_date,
            phase=body.phase,
        )
        session.add(existing)
        try:
            await session.commit()
        except IntegrityError:
            await session.rollback()
            existing = await _get_override(user.id, override_date, session)
            assert existing is not None
            existing.phase = body.phase
            existing.created_at = now
            await session.commit()
    else:
        existing.phase = body.phase
        existing.created_at = now
        await session.commit()

    return await get_today_phase(user=user, session=session)


@router.delete("/override/{override_date}", response_model=PhaseInfo)
async def clear_override(
    override_date: date,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Remove the manual override for a date (revert to the estimate)."""
    existing = await _get_override(user.id, override_date, session)
    if existing is not None:
        await session.delete(existing)
        await session.commit()
    return await get_today_phase(user=user, session=session)
