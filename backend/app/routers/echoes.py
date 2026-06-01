# SPDX-License-Identifier: AGPL-3.0-or-later
"""Échos routes: cross-cycle memory aggregated by parent phase."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user
from app.database import get_session
from app.models.user import User
from app.schemas.echo import EchoResponse
from app.services.cycle_engine import PARENT_OF_SUBPHASE
from app.services.echoes import aggregate_echoes

router = APIRouter(prefix="/api/echoes", tags=["echoes"])

_PARENTS = set(PARENT_OF_SUBPHASE.values())


@router.get("/current", response_model=EchoResponse)
async def get_current_echoes(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Échos for the user's current parent phase (today)."""
    return await aggregate_echoes(user.id, date.today(), session)


@router.get("/{parent_phase}", response_model=EchoResponse)
async def get_echoes_for_parent(
    parent_phase: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Échos for an explicit parent phase (menstrual|follicular|ovulatory|luteal)."""
    if parent_phase not in _PARENTS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="error.invalid_parent_phase",
        )
    return await aggregate_echoes(user.id, date.today(), session, parent=parent_phase)
