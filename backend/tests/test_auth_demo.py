# SPDX-License-Identifier: AGPL-3.0-or-later
"""App Store review account: fixed code, no email, no token row."""

from unittest.mock import AsyncMock, patch

from sqlmodel import select

from app.config import settings
from app.models.magic_link import MagicLinkToken
from app.models.user import User


async def test_demo_request_sends_no_email(client, session):
    with patch("app.routers.auth.send_magic_link_email", new=AsyncMock()) as send:
        res = await client.post("/api/auth/magic-link", json={"email": "Test@Demo.fr"})
    assert res.status_code == 202
    send.assert_not_called()
    assert (await session.exec(select(MagicLinkToken))).all() == []


async def test_demo_verify_with_fixed_code(client, session):
    for _ in range(2):  # reusable, unlike regular codes
        res = await client.post(
            "/api/auth/verify", json={"email": "test@demo.fr", "token": settings.DEMO_CODE}
        )
        assert res.status_code == 200
        assert res.json()["access_token"]
    users = (await session.exec(select(User).where(User.email == "test@demo.fr"))).all()
    assert len(users) == 1


async def test_demo_verify_wrong_code(client):
    res = await client.post("/api/auth/verify", json={"email": "test@demo.fr", "token": "000000"})
    assert res.status_code == 400


async def test_demo_disabled_without_code(client):
    with patch.object(settings, "DEMO_CODE", ""):
        res = await client.post("/api/auth/verify", json={"email": "test@demo.fr", "token": ""})
    assert res.status_code == 400
