# SPDX-License-Identifier: AGPL-3.0-or-later
"""Phase routes: current phase and calendar projections."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user
from app.database import get_session
from app.models.cycle import Cycle
from app.models.event import Event
from app.models.user import User
from app.schemas.phase import CalendarMonth, PhaseInfo
from app.services.cycle_engine import calculate_calendar_month, calculate_phase

router = APIRouter(prefix="/api/phases", tags=["phases"])


@router.get("/today", response_model=PhaseInfo)
async def get_today_phase(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get the phase information for today."""
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

    info = calculate_phase(date.today(), list(cycles), list(events))
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
