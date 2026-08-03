# SPDX-License-Identifier: AGPL-3.0-or-later
"""Échos aggregation tests (service level)."""

import json
from datetime import date, timedelta

from httpx import AsyncClient
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.cycle import Cycle
from app.models.event import Event
from app.models.journal import JournalEntry
from app.models.user import User
from app.services.cycle_engine import calculate_phase, recalculate_cycles
from app.services.echoes import aggregate_echoes, sub_phases_of


def _journal(user_id, d: date, pastilles, helpful=None, not_helpful=None, free=None):
    return JournalEntry(
        user_id=user_id,
        entry_date=d,
        pastilles_json=json.dumps(pastilles),
        helpful=helpful,
        not_helpful=not_helpful,
        free_text=free,
    )


async def _seed(session: AsyncSession, user: User) -> None:
    # Three confirmed cycles: Jan 1, Jan 29, Feb 26 (the current one).
    for d in (date(2026, 1, 1), date(2026, 1, 29), date(2026, 2, 26)):
        session.add(Event(user_id=user.id, event_type="period_started", event_date=d))
    await session.flush()
    await recalculate_cycles(user.id, session)

    # Menstrual-phase entries in the two PAST cycles.
    session.add(_journal(user.id, date(2026, 1, 2), ["fatigue", "douleur"],
                         helpful="bouillotte", free="jour difficile"))
    session.add(_journal(user.id, date(2026, 1, 30), ["fatigue", "tendresse"],
                         helpful="soirée annulée", free="mieux que le mois dernier"))
    # An ovulatory-phase entry (day ~15) — must be filtered out of menstrual échos.
    session.add(_journal(user.id, date(2026, 1, 15), ["coquin"], helpful="sortie"))
    # Current-cycle menstrual entry, NOT today — included (option C).
    session.add(_journal(user.id, date(2026, 2, 27), ["fatigue"], helpful="ce cycle inclus"))
    # Today's own entry — excluded (no self-echo).
    session.add(_journal(user.id, date(2026, 2, 28), ["fatigue"], helpful="aujourd'hui exclu"))
    await session.commit()


async def test_echoes_aggregate_menstrual(session: AsyncSession, user: User):
    await _seed(session, user)

    echo = await aggregate_echoes(user.id, date(2026, 2, 28), session)

    assert echo.parent_phase == "menstrual"
    assert "menstruation" in echo.sub_phases

    # Only occurrences carrying a note make the history (recent first). The
    # current-cycle entry (2026-02-27) has none: it would render empty.
    assert len(echo.history) == 2
    assert echo.history[0].cycle_start == date(2026, 1, 29)
    assert echo.history[1].cycle_start == date(2026, 1, 1)
    assert all(h.note for h in echo.history)

    # Helpful, most recent first; current-cycle entry present, today's own absent.
    assert echo.helpful == ["ce cycle inclus", "soirée annulée", "bouillotte"]
    assert "aujourd'hui exclu" not in echo.helpful

    # Frequent pastilles: fatigue appears in the 3 matching entries.
    freq = {f.pastille: f for f in echo.frequent}
    assert freq["fatigue"].count == 3
    assert freq["fatigue"].total == 3
    assert "coquin" not in freq  # ovulatory entry excluded


async def test_echoes_ignore_blank_entries(session: AsyncSession, user: User):
    """Legacy blank rows must not surface as empty échos nor skew the totals."""
    await _seed(session, user)
    # A menstrual-phase row with nothing but whitespace (stored before the
    # upsert route started dropping blanks).
    session.add(_journal(user.id, date(2026, 1, 3), [], free="   ", helpful=" "))
    await session.commit()

    echo = await aggregate_echoes(user.id, date(2026, 2, 28), session)

    assert len(echo.history) == 2  # the blank row adds no occurrence
    assert all(h.note and h.note.strip() for h in echo.history)
    assert all(text.strip() for text in echo.helpful)
    freq = {f.pastille: f for f in echo.frequent}
    assert freq["fatigue"].total == 3  # denominator untouched by the blank row


async def test_echoes_explicit_phase(session: AsyncSession, user: User):
    await _seed(session, user)
    echo = await aggregate_echoes(user.id, date(2026, 2, 28), session, phases=["ovulation"])
    assert echo.sub_phases == ["ovulation"]
    assert echo.parent_phase == "ovulatory"
    # The ovulatory entry sits in the current cycle's PAST? No — Jan 15 is cycle 1.
    freq = {f.pastille: f for f in echo.frequent}
    assert "coquin" in freq


async def _find_date(session: AsyncSession, user: User, phase: str) -> date:
    """First date of the January cycle landing on ``phase``."""
    cycles = list(
        (
            await session.exec(
                select(Cycle).where(Cycle.user_id == user.id).order_by(Cycle.start_date)  # type: ignore[arg-type]
            )
        ).all()
    )
    events = list(
        (
            await session.exec(
                select(Event).where(Event.user_id == user.id).order_by(Event.event_date)  # type: ignore[arg-type]
            )
        ).all()
    )
    for offset in range(28):
        d = date(2026, 1, 1) + timedelta(days=offset)
        if calculate_phase(d, cycles, events)["phase"] == phase:
            return d
    raise AssertionError(f"no {phase} day found in the January cycle")


async def test_echoes_split_sibling_subphases(session: AsyncSession, user: User):
    """Two sub-phases of the same parent must not echo each other's content."""
    await _seed(session, user)
    post_menstrual_day = await _find_date(session, user, "post_menstrual")
    pre_ovulatory_day = await _find_date(session, user, "pre_ovulatory")

    session.add(_journal(user.id, post_menstrual_day, ["rires"], free="note post-menstruelle"))
    session.add(_journal(user.id, pre_ovulatory_day, ["energie"], free="note pré-ovulatoire"))
    await session.commit()

    post = await aggregate_echoes(
        user.id, date(2026, 2, 28), session, phases=["post_menstrual"]
    )
    pre = await aggregate_echoes(
        user.id, date(2026, 2, 28), session, phases=["pre_ovulatory"]
    )

    assert [h.note for h in post.history] == ["note post-menstruelle"]
    assert [h.note for h in pre.history] == ["note pré-ovulatoire"]
    assert [f.pastille for f in post.frequent] == ["rires"]
    assert [f.pastille for f in pre.frequent] == ["energie"]
    # Both still report the same parent — only the content is now disjoint.
    assert post.parent_phase == pre.parent_phase == "follicular"


async def test_echoes_route_accepts_sub_and_parent_phases(client: AsyncClient):
    """/api/echoes/{phase} takes a sub-phase, still tolerates a parent key."""
    assert (await client.get("/api/echoes/post_menstrual")).json()["sub_phases"] == [
        "post_menstrual"
    ]
    grouped = (await client.get("/api/echoes/follicular")).json()["sub_phases"]
    assert sorted(grouped) == ["post_menstrual", "pre_ovulatory"]
    assert (await client.get("/api/echoes/nope")).status_code == 404


async def test_echoes_parent_key_still_groups(session: AsyncSession, user: User):
    """Legacy clients asking by parent phase keep the grouped aggregate."""
    await _seed(session, user)
    session.add(
        _journal(user.id, await _find_date(session, user, "post_menstrual"), ["rires"])
    )
    session.add(
        _journal(user.id, await _find_date(session, user, "pre_ovulatory"), ["energie"])
    )
    await session.commit()

    echo = await aggregate_echoes(
        user.id, date(2026, 2, 28), session, phases=sub_phases_of("follicular")
    )
    assert sorted(echo.sub_phases) == ["post_menstrual", "pre_ovulatory"]
    assert sorted(f.pastille for f in echo.frequent) == ["energie", "rires"]
