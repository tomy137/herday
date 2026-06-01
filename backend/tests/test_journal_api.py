# SPDX-License-Identifier: AGPL-3.0-or-later
"""Journal API tests."""

from datetime import date

from httpx import AsyncClient


async def test_get_today_empty(client: AsyncClient):
    """A day with no entry returns a normalized empty entry (200)."""
    today = date.today().isoformat()
    resp = await client.get("/api/journal/today")
    assert resp.status_code == 200
    body = resp.json()
    assert body["entry_date"] == today
    assert body["pastilles"] == []
    assert body["free_text"] is None


async def test_upsert_is_idempotent(client: AsyncClient):
    """Two PUTs on the same date keep a single row, the second overwrites."""
    d = "2026-05-10"
    r1 = await client.put(
        f"/api/journal/{d}",
        json={"pastilles": ["fatigue", "tendresse"], "free_text": "calme", "helpful": "soirée"},
    )
    assert r1.status_code == 200
    assert r1.json()["pastilles"] == ["fatigue", "tendresse"]

    r2 = await client.put(
        f"/api/journal/{d}",
        json={"pastilles": ["rires"], "free_text": "mieux"},
    )
    assert r2.status_code == 200
    assert r2.json()["pastilles"] == ["rires"]
    assert r2.json()["free_text"] == "mieux"
    assert r2.json()["helpful"] is None  # overwritten

    listing = await client.get("/api/journal")
    assert listing.json()["total"] == 1


async def test_invalid_pastille_rejected(client: AsyncClient):
    """An unknown pastille id is rejected with 422."""
    resp = await client.put(
        "/api/journal/2026-05-11",
        json={"pastilles": ["not-a-real-pastille"]},
    )
    assert resp.status_code == 422


async def test_pastilles_deduplicated(client: AsyncClient):
    """Duplicate pastille ids are collapsed, order preserved."""
    resp = await client.put(
        "/api/journal/2026-05-12",
        json={"pastilles": ["fatigue", "fatigue", "rires"]},
    )
    assert resp.status_code == 200
    assert resp.json()["pastilles"] == ["fatigue", "rires"]


async def test_delete_entry(client: AsyncClient):
    d = "2026-05-13"
    await client.put(f"/api/journal/{d}", json={"pastilles": ["repli"]})
    resp = await client.delete(f"/api/journal/{d}")
    assert resp.status_code == 204
    # back to empty
    after = await client.get(f"/api/journal/{d}")
    assert after.json()["pastilles"] == []
