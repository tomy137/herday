# SPDX-License-Identifier: AGPL-3.0-or-later
"""Phase override API tests."""

from datetime import date

from httpx import AsyncClient
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.cycle import Cycle
from app.models.event import Event
from app.models.user import User
from app.services.cycle_engine import recalculate_cycles


async def _seed_cycle(session: AsyncSession, user: User) -> None:
    """Create a confirmed cycle starting today so /today has a real phase."""
    session.add(
        Event(user_id=user.id, event_type="period_started", event_date=date.today())
    )
    await session.flush()
    await recalculate_cycles(user.id, session)
    await session.commit()


async def test_override_reflected_in_today(client: AsyncClient, session: AsyncSession, user: User):
    await _seed_cycle(session, user)
    today = date.today().isoformat()

    before = (await client.get("/api/phases/today")).json()
    assert before["is_override"] is False

    resp = await client.put(f"/api/phases/override/{today}", json={"phase": "pre_menstrual"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["phase"] == "pre_menstrual"
    assert body["is_override"] is True
    assert body["parent_phase"] == "luteal"
    assert body["estimated_phase"] == before["phase"]


async def test_override_does_not_shift_cycles(client: AsyncClient, session: AsyncSession, user: User):
    """Setting an override must not create/alter cycles (regression guard)."""
    await _seed_cycle(session, user)
    today = date.today().isoformat()

    cycles_before = (await session.exec(select(Cycle).where(Cycle.user_id == user.id))).all()
    await client.put(f"/api/phases/override/{today}", json={"phase": "ovulation"})
    cycles_after = (await session.exec(select(Cycle).where(Cycle.user_id == user.id))).all()

    assert len(cycles_before) == len(cycles_after)
    assert {c.start_date for c in cycles_before} == {c.start_date for c in cycles_after}


async def test_clear_override_reverts(client: AsyncClient, session: AsyncSession, user: User):
    await _seed_cycle(session, user)
    today = date.today().isoformat()

    await client.put(f"/api/phases/override/{today}", json={"phase": "ovulation"})
    resp = await client.delete(f"/api/phases/override/{today}")
    assert resp.status_code == 200
    assert resp.json()["is_override"] is False


async def test_invalid_phase_rejected(client: AsyncClient, session: AsyncSession, user: User):
    await _seed_cycle(session, user)
    resp = await client.put(
        f"/api/phases/override/{date.today().isoformat()}", json={"phase": "nope"}
    )
    assert resp.status_code == 422
