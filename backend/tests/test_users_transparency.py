# SPDX-License-Identifier: AGPL-3.0-or-later
"""Transparency pact (user) API tests."""

from httpx import AsyncClient


async def test_default_status_not_yet(client: AsyncClient):
    resp = await client.get("/api/users/me")
    assert resp.status_code == 200
    body = resp.json()
    assert body["transparency_status"] == "not_yet"
    assert body["transparency_accepted_at"] is None


async def test_accepting_stamps_timestamp(client: AsyncClient):
    resp = await client.patch("/api/users/me", json={"transparency_status": "told_soon"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["transparency_status"] == "told_soon"
    assert body["transparency_accepted_at"] is not None

    # Accepted timestamp is preserved across further updates.
    first_ts = body["transparency_accepted_at"]
    resp2 = await client.patch("/api/users/me", json={"transparency_status": "told_already"})
    assert resp2.json()["transparency_accepted_at"] == first_ts


async def test_invalid_status_rejected(client: AsyncClient):
    resp = await client.patch("/api/users/me", json={"transparency_status": "whatever"})
    assert resp.status_code == 422
