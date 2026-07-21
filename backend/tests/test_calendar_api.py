# SPDX-License-Identifier: AGPL-3.0-or-later
"""Integration tests for the calendar subscription API and the public feed."""

from datetime import date, timedelta

from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.event import Event
from app.models.user import User
from app.services.cycle_engine import recalculate_cycles


def _token_from_url(url: str) -> str:
    # .../api/calendar/<token>.ics
    return url.rsplit("/", 1)[-1].removesuffix(".ics")


async def _seed_confident(session: AsyncSession, user: User) -> None:
    """Three monthly periods ending near today → predictable future blocks."""
    today = date.today()
    for start in (today - timedelta(days=56), today - timedelta(days=28), today):
        session.add(Event(user_id=user.id, event_type="period_started", event_date=start))
    await session.flush()
    await recalculate_cycles(user.id, session)
    await session.commit()


async def test_enable_returns_feed_url(client: AsyncClient):
    r = await client.post("/api/calendar/subscription/enable")
    assert r.status_code == 200
    body = r.json()
    assert body["enabled"] is True
    assert body["labels_mode"] == "discreet"
    assert body["feed_url"].endswith(".ics")
    assert body["webcal_url"].startswith("webcal://")


async def test_disabled_by_default(client: AsyncClient):
    r = await client.get("/api/calendar/subscription")
    assert r.status_code == 200
    body = r.json()
    assert body["enabled"] is False
    assert body["feed_url"] is None


async def test_feed_served_unauthenticated(
    client: AsyncClient, session: AsyncSession, user: User
):
    await _seed_confident(session, user)
    enable = (await client.post("/api/calendar/subscription/enable")).json()
    token = _token_from_url(enable["feed_url"])

    r = await client.get(f"/api/calendar/{token}.ics")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/calendar")
    assert r.headers["cache-control"] == "no-store, private"
    assert "BEGIN:VCALENDAR" in r.text
    assert "BEGIN:VEVENT" in r.text  # seeded cycles produce blocks


async def test_unknown_token_is_404(client: AsyncClient):
    r = await client.get("/api/calendar/does-not-exist.ics")
    assert r.status_code == 404


async def test_rotate_revokes_old_url(
    client: AsyncClient, session: AsyncSession, user: User
):
    await _seed_confident(session, user)
    old = _token_from_url((await client.post("/api/calendar/subscription/enable")).json()["feed_url"])
    new = _token_from_url((await client.post("/api/calendar/subscription/rotate")).json()["feed_url"])

    assert old != new
    assert (await client.get(f"/api/calendar/{old}.ics")).status_code == 404
    assert (await client.get(f"/api/calendar/{new}.ics")).status_code == 200


async def test_disable_makes_feed_404(
    client: AsyncClient, session: AsyncSession, user: User
):
    await _seed_confident(session, user)
    token = _token_from_url((await client.post("/api/calendar/subscription/enable")).json()["feed_url"])
    assert (await client.get(f"/api/calendar/{token}.ics")).status_code == 200

    await client.delete("/api/calendar/subscription")
    assert (await client.get(f"/api/calendar/{token}.ics")).status_code == 404


async def test_labels_mode_validation(client: AsyncClient):
    await client.post("/api/calendar/subscription/enable")
    ok = await client.patch("/api/calendar/subscription", json={"labels_mode": "explicit"})
    assert ok.status_code == 200
    assert ok.json()["labels_mode"] == "explicit"

    bad = await client.patch("/api/calendar/subscription", json={"labels_mode": "nope"})
    assert bad.status_code == 422
