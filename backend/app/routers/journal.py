# SPDX-License-Identifier: AGPL-3.0-or-later
"""Journal routes: daily observation entries (one per day, upserted)."""

import json
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.exc import IntegrityError
from sqlmodel import func, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user
from app.database import get_session
from app.models.journal import JournalEntry
from app.models.user import User
from app.schemas.journal import JournalList, JournalResponse, JournalUpsert

router = APIRouter(prefix="/api/journal", tags=["journal"])


def _to_response(entry: JournalEntry) -> JournalResponse:
    return JournalResponse(
        entry_date=entry.entry_date,
        pastilles=json.loads(entry.pastilles_json or "[]"),
        free_text=entry.free_text,
        helpful=entry.helpful,
        not_helpful=entry.not_helpful,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
    )


def _empty_response(entry_date: date) -> JournalResponse:
    return JournalResponse(
        entry_date=entry_date,
        pastilles=[],
        free_text=None,
        helpful=None,
        not_helpful=None,
    )


async def _get_entry(
    user_id, entry_date: date, session: AsyncSession
) -> JournalEntry | None:
    result = await session.exec(
        select(JournalEntry).where(
            JournalEntry.user_id == user_id,
            JournalEntry.entry_date == entry_date,
        ),
    )
    return result.first()


@router.get("/today", response_model=JournalResponse)
async def get_today(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Return today's entry, or a normalized empty entry if none yet."""
    today = date.today()
    entry = await _get_entry(user.id, today, session)
    return _to_response(entry) if entry else _empty_response(today)


@router.get("", response_model=JournalList)
async def list_entries(
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """List the user's journal entries (most recent first)."""
    count_stmt = (
        select(func.count())
        .select_from(JournalEntry)
        .where(JournalEntry.user_id == user.id)
    )
    total = (await session.exec(count_stmt)).one()

    stmt = (
        select(JournalEntry)
        .where(JournalEntry.user_id == user.id)
        .order_by(JournalEntry.entry_date.desc())  # type: ignore[union-attr]
        .offset(offset)
        .limit(limit)
    )
    entries = (await session.exec(stmt)).all()
    return JournalList(items=[_to_response(e) for e in entries], total=total)


@router.get("/{entry_date}", response_model=JournalResponse)
async def get_entry(
    entry_date: date,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Return the entry for a given date, or a normalized empty entry."""
    entry = await _get_entry(user.id, entry_date, session)
    return _to_response(entry) if entry else _empty_response(entry_date)


@router.put("/{entry_date}", response_model=JournalResponse)
async def upsert_entry(
    entry_date: date,
    body: JournalUpsert,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Create or update the entry for a given date.

    A blank entry (no pastille, no text) is never stored: emptying an existing
    entry deletes it, so it stops surfacing as an empty écho.
    """
    pastilles_json = json.dumps(body.pastilles)
    now = datetime.now(timezone.utc)

    entry = await _get_entry(user.id, entry_date, session)

    if body.is_empty:
        if entry is not None:
            await session.delete(entry)
            await session.commit()
        return _empty_response(entry_date)

    if entry is None:
        entry = JournalEntry(
            user_id=user.id,
            entry_date=entry_date,
            pastilles_json=pastilles_json,
            free_text=body.free_text,
            helpful=body.helpful,
            not_helpful=body.not_helpful,
        )
        session.add(entry)
        try:
            await session.commit()
        except IntegrityError:
            # Lost an upsert race — fall back to updating the existing row.
            await session.rollback()
            entry = await _get_entry(user.id, entry_date, session)
            assert entry is not None
            _apply(entry, pastilles_json, body, now)
            await session.commit()
    else:
        _apply(entry, pastilles_json, body, now)
        await session.commit()

    await session.refresh(entry)
    return _to_response(entry)


def _apply(entry: JournalEntry, pastilles_json: str, body: JournalUpsert, now) -> None:
    entry.pastilles_json = pastilles_json
    entry.free_text = body.free_text
    entry.helpful = body.helpful
    entry.not_helpful = body.not_helpful
    entry.updated_at = now


@router.delete("/{entry_date}", status_code=204)
async def delete_entry(
    entry_date: date,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Delete the entry for a given date (no-op if absent)."""
    entry = await _get_entry(user.id, entry_date, session)
    if entry is not None:
        await session.delete(entry)
        await session.commit()
