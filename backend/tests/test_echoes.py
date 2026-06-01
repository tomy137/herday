# SPDX-License-Identifier: AGPL-3.0-or-later
"""Échos aggregation tests (service level)."""

import json
from datetime import date

from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.event import Event
from app.models.journal import JournalEntry
from app.models.user import User
from app.services.cycle_engine import recalculate_cycles
from app.services.echoes import aggregate_echoes


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
    # A current-cycle menstrual entry — must be excluded from the memory.
    session.add(_journal(user.id, date(2026, 2, 27), ["fatigue"], helpful="ne compte pas"))
    await session.commit()


async def test_echoes_aggregate_menstrual(session: AsyncSession, user: User):
    await _seed(session, user)

    echo = await aggregate_echoes(user.id, date(2026, 2, 28), session)

    assert echo.parent_phase == "menstrual"
    assert "menstruation" in echo.sub_phases

    # Two past occurrences (current cycle excluded), most recent first.
    assert len(echo.history) == 2
    assert echo.history[0].cycle_start == date(2026, 1, 29)
    assert echo.history[1].cycle_start == date(2026, 1, 1)

    # Helpful items, most recent first; the current-cycle one is absent.
    assert echo.helpful == ["soirée annulée", "bouillotte"]
    assert "ne compte pas" not in echo.helpful

    # Frequent pastilles: fatigue appears in both past entries.
    freq = {f.pastille: f for f in echo.frequent}
    assert freq["fatigue"].count == 2
    assert freq["fatigue"].total == 2
    assert "coquin" not in freq  # ovulatory entry excluded


async def test_echoes_explicit_parent(session: AsyncSession, user: User):
    await _seed(session, user)
    echo = await aggregate_echoes(user.id, date(2026, 2, 28), session, parent="ovulatory")
    assert echo.parent_phase == "ovulatory"
    # The ovulatory entry sits in the current cycle's PAST? No — Jan 15 is cycle 1.
    freq = {f.pastille: f for f in echo.frequent}
    assert "coquin" in freq
