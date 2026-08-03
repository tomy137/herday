# SPDX-License-Identifier: AGPL-3.0-or-later
"""Échos routes: cross-cycle memory aggregated by sub-phase."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user
from app.database import get_session
from app.models.user import User
from app.schemas.echo import EchoResponse
from app.services.cycle_engine import PARENT_OF_SUBPHASE
from app.services.echoes import aggregate_echoes, sub_phases_of

router = APIRouter(prefix="/api/echoes", tags=["echoes"])

_SUB_PHASES = {p.value for p in PARENT_OF_SUBPHASE}
_PARENTS = set(PARENT_OF_SUBPHASE.values())


@router.get("/current", response_model=EchoResponse)
async def get_current_echoes(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Échos for the user's current sub-phase (today)."""
    return await aggregate_echoes(user.id, date.today(), session)


@router.get("/{phase}", response_model=EchoResponse)
async def get_echoes_for_phase(
    phase: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Échos for one sub-phase (menstruation|post_menstrual|…).

    A parent-phase key (menstrual|follicular|ovulatory|luteal) is still
    accepted and expands to its sub-phases, for clients shipped before the
    échos moved to sub-phase granularity.
    """
    if phase in _SUB_PHASES:
        phases = [phase]
    elif phase in _PARENTS:
        phases = sub_phases_of(phase)
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="error.invalid_phase",
        )
    return await aggregate_echoes(user.id, date.today(), session, phases=phases)
