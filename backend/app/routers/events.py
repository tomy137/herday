# SPDX-License-Identifier: AGPL-3.0-or-later
"""Event routes: CRUD for cycle-related events."""

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user
from app.database import get_session
from app.models.event import Event
from app.models.user import User
from app.schemas.event import EventCreate, EventList, EventResponse
from app.services.cycle_engine import recalculate_cycles

router = APIRouter(prefix="/api/events", tags=["events"])


def _event_to_response(event: Event) -> EventResponse:
    """Convert an Event model to an EventResponse schema."""
    metadata = None
    if event.metadata_json:
        metadata = json.loads(event.metadata_json)
    return EventResponse(
        id=event.id,
        event_type=event.event_type,
        event_date=event.event_date,
        metadata=metadata,
        confidence=event.confidence,
        created_at=event.created_at,
    )


@router.get("", response_model=EventList)
async def list_events(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """List events for the current user (paginated)."""
    # Count total
    count_stmt = (
        select(func.count())
        .select_from(Event)
        .where(Event.user_id == user.id)
    )
    total_result = await session.exec(count_stmt)
    total = total_result.one()

    # Fetch page
    stmt = (
        select(Event)
        .where(Event.user_id == user.id)
        .order_by(Event.event_date.desc())  # type: ignore[union-attr]
        .offset(offset)
        .limit(limit)
    )
    result = await session.exec(stmt)
    events = result.all()

    return EventList(
        items=[_event_to_response(e) for e in events],
        total=total,
    )


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
async def create_event(
    body: EventCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Create a new event and recalculate cycles."""
    metadata_json = None
    if body.metadata is not None:
        metadata_json = json.dumps(body.metadata)

    event = Event(
        user_id=user.id,
        event_type=body.event_type,
        event_date=body.event_date,
        metadata_json=metadata_json,
        confidence=body.confidence,
    )
    session.add(event)
    await session.flush()

    # Recalculate cycles after new event
    await recalculate_cycles(user.id, session)
    await session.commit()
    await session.refresh(event)

    return _event_to_response(event)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event(
    event_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Delete an event and recalculate cycles."""
    stmt = select(Event).where(Event.id == event_id, Event.user_id == user.id)
    result = await session.exec(stmt)
    event = result.first()

    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="error.event_not_found",
        )

    await session.delete(event)
    await session.flush()

    # Recalculate cycles after deletion
    await recalculate_cycles(user.id, session)
    await session.commit()
