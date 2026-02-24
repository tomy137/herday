# SPDX-License-Identifier: AGPL-3.0-or-later
"""Cycle routes: read-only access to deduced cycles."""

from fastapi import APIRouter, Depends
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user
from app.database import get_session
from app.models.cycle import Cycle
from app.models.user import User
from app.schemas.cycle import CycleResponse

router = APIRouter(prefix="/api/cycles", tags=["cycles"])


@router.get("", response_model=list[CycleResponse])
async def list_cycles(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """List all deduced cycles for the current user."""
    stmt = (
        select(Cycle)
        .where(Cycle.user_id == user.id)
        .order_by(Cycle.start_date.desc())  # type: ignore[union-attr]
    )
    result = await session.exec(stmt)
    cycles = result.all()

    return [
        CycleResponse(
            id=c.id,
            start_date=c.start_date,
            end_date=c.end_date,
            period_duration=c.period_duration,
            cycle_length=c.cycle_length,
            source=c.source,
            confidence=c.confidence,
            created_at=c.created_at,
        )
        for c in cycles
    ]
