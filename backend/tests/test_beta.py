# SPDX-License-Identifier: AGPL-3.0-or-later
"""Public beta routes: /welcome config, tester sign-up, APK download."""

from unittest.mock import AsyncMock, patch

import aiosmtplib
from httpx import ASGITransport, AsyncClient
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import settings
from app.database import get_session
from app.main import create_app
from app.models.beta_signup import BetaSignup

SIGNUP = {"first_name": " Nico ", "email": "Nico@Example.com", "platform": "android", "source": "Thomas"}


async def test_config_without_apk_nor_testflight(client, tmp_path):
    with patch.object(settings, "ANDROID_APK_PATH", str(tmp_path / "missing.apk")), \
         patch.object(settings, "TESTFLIGHT_URL", ""):
        res = await client.get("/api/beta/config")
    assert res.json() == {"testflight_url": None, "android_apk_available": False}


async def test_config_with_apk_and_testflight(client, tmp_path):
    apk = tmp_path / "HerDays.apk"
    apk.write_bytes(b"PK")
    with patch.object(settings, "ANDROID_APK_PATH", str(apk)), \
         patch.object(settings, "TESTFLIGHT_URL", "https://testflight.apple.com/join/abc"):
        res = await client.get("/api/beta/config")
    assert res.json() == {"testflight_url": "https://testflight.apple.com/join/abc", "android_apk_available": True}


async def test_signup_then_resubmit_updates_same_row(client, session):
    with patch("app.routers.beta.send_beta_signup_notification", new=AsyncMock()) as notify:
        assert (await client.post("/api/beta/signup", json=SIGNUP)).status_code == 201
        again = {**SIGNUP, "email": "nico@example.com", "platform": "ios", "source": "  "}
        assert (await client.post("/api/beta/signup", json=again)).status_code == 201
    assert notify.await_count == 2
    rows = (await session.exec(select(BetaSignup))).all()
    assert len(rows) == 1
    assert rows[0].email == "nico@example.com"
    assert rows[0].first_name == "Nico"
    assert rows[0].platform == "ios"
    assert rows[0].source is None


async def test_honeypot_is_not_stored(client, session):
    with patch("app.routers.beta.send_beta_signup_notification", new=AsyncMock()) as notify:
        res = await client.post("/api/beta/signup", json={**SIGNUP, "website": "spam.example"})
    assert res.status_code == 201
    notify.assert_not_awaited()
    assert (await session.exec(select(BetaSignup))).all() == []


async def test_invalid_platform_or_blank_name_rejected(client):
    assert (await client.post("/api/beta/signup", json={**SIGNUP, "platform": "windows"})).status_code == 422
    assert (await client.post("/api/beta/signup", json={**SIGNUP, "first_name": "   "})).status_code == 422


async def test_notification_failure_keeps_signup(client, session):
    down = AsyncMock(side_effect=aiosmtplib.SMTPConnectError("down"))
    with patch("app.routers.beta.send_beta_signup_notification", new=down):
        res = await client.post("/api/beta/signup", json=SIGNUP)
    assert res.status_code == 201
    assert len((await session.exec(select(BetaSignup))).all()) == 1


async def test_signup_with_real_notification_and_expiring_session(engine):
    """Prod sessions expire attributes on commit: the notification must not lazy-load them."""
    app = create_app()

    async def _prod_like_session():
        async with AsyncSession(engine) as s:  # expire_on_commit=True, as in app.database
            yield s

    app.dependency_overrides[get_session] = _prod_like_session
    with patch.object(settings, "BETA_NOTIFY_EMAIL", "moi@example.com"), patch.object(settings, "SMTP_HOST", ""):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            res = await c.post("/api/beta/signup", json=SIGNUP)
    assert res.status_code == 201


async def test_download_apk(client, tmp_path):
    with patch.object(settings, "ANDROID_APK_PATH", str(tmp_path / "missing.apk")):
        assert (await client.get("/download/herdays.apk")).status_code == 404
    apk = tmp_path / "HerDays.apk"
    apk.write_bytes(b"PK\x03\x04")
    with patch.object(settings, "ANDROID_APK_PATH", str(apk)):
        res = await client.get("/download/herdays.apk")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/vnd.android.package-archive"
    assert "HerDays.apk" in res.headers["content-disposition"]
    assert res.content == b"PK\x03\x04"
