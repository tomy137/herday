# SPDX-License-Identifier: AGPL-3.0-or-later
"""Public beta routes: /welcome config, tester sign-up, gated APK download."""

from unittest.mock import AsyncMock, patch

import aiosmtplib
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine, inspect, text
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import settings
from app.database import _ensure_added_columns, get_session
from app.main import create_app
from app.models.beta_signup import BetaSignup

SIGNUP = {"first_name": " Nico ", "email": "Nico@Example.com", "platform": "android", "source": "Thomas"}
TESTFLIGHT = "https://testflight.apple.com/join/abc"


@pytest.fixture
def apk(tmp_path):
    path = tmp_path / "HerDays.apk"
    path.write_bytes(b"PK\x03\x04")
    with patch.object(settings, "ANDROID_APK_PATH", str(path)):
        yield path


@pytest.fixture
def no_notify():
    with patch("app.routers.beta.send_beta_signup_notification", new=AsyncMock()) as notify:
        yield notify


async def test_config_gives_no_links(client, apk):
    with patch.object(settings, "TESTFLIGHT_URL", TESTFLIGHT):
        res = await client.get("/api/beta/config")
    assert res.json() == {"testflight_available": True, "android_apk_available": True}


async def test_config_without_apk_nor_testflight(client, tmp_path):
    with patch.object(settings, "ANDROID_APK_PATH", str(tmp_path / "missing.apk")), \
         patch.object(settings, "TESTFLIGHT_URL", ""):
        res = await client.get("/api/beta/config")
    assert res.json() == {"testflight_available": False, "android_apk_available": False}


async def test_signup_hands_out_links(client, apk, no_notify):
    with patch.object(settings, "TESTFLIGHT_URL", TESTFLIGHT):
        res = await client.post("/api/beta/signup", json=SIGNUP)
    assert res.status_code == 201
    body = res.json()
    assert body["testflight_url"] == TESTFLIGHT
    assert body["download_url"].startswith("/download/herdays.apk?token=")


async def test_signup_without_apk_gives_no_download_link(client, tmp_path, no_notify):
    with patch.object(settings, "ANDROID_APK_PATH", str(tmp_path / "missing.apk")):
        res = await client.post("/api/beta/signup", json=SIGNUP)
    assert res.json()["download_url"] is None


async def test_resubmit_updates_same_row_and_keeps_token(client, session, apk, no_notify):
    first = (await client.post("/api/beta/signup", json=SIGNUP)).json()
    again = {**SIGNUP, "email": "nico@example.com", "platform": "ios", "source": "  "}
    second = (await client.post("/api/beta/signup", json=again)).json()
    assert first["download_url"] == second["download_url"]
    assert no_notify.await_count == 2
    rows = (await session.exec(select(BetaSignup))).all()
    assert len(rows) == 1
    assert rows[0].email == "nico@example.com"
    assert rows[0].first_name == "Nico"
    assert rows[0].platform == "ios"
    assert rows[0].source is None


async def test_honeypot_is_not_stored_and_gets_no_link(client, session, apk, no_notify):
    res = await client.post("/api/beta/signup", json={**SIGNUP, "website": "spam.example"})
    assert res.status_code == 201
    assert res.json()["download_url"] is None
    no_notify.assert_not_awaited()
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


async def test_download_requires_a_signup_token(client, apk, no_notify):
    for url in ("/download/herdays.apk", "/download/herdays.apk?token=nope"):
        res = await client.get(url)
        assert res.status_code == 303
        assert res.headers["location"] == "/welcome#inscription"

    link = (await client.post("/api/beta/signup", json=SIGNUP)).json()["download_url"]
    res = await client.get(link)
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/vnd.android.package-archive"
    assert "HerDays.apk" in res.headers["content-disposition"]
    assert res.content == b"PK\x03\x04"
    assert (await client.head(link)).status_code == 200


def test_download_token_column_added_to_existing_table(tmp_path):
    """Prod already has beta_signup without download_token: startup must add it."""
    eng = create_engine(f"sqlite:///{tmp_path / 'old.db'}")
    with eng.begin() as conn:
        conn.exec_driver_sql(
            'CREATE TABLE beta_signup (id CHAR(32) PRIMARY KEY, first_name VARCHAR, email VARCHAR, '
            "platform VARCHAR, source VARCHAR, message VARCHAR, created_at DATETIME)"
        )
        conn.execute(text("INSERT INTO beta_signup (id, first_name, email, platform) VALUES ('1', 'A', 'a@b.c', 'ios')"))
        _ensure_added_columns(conn)
        _ensure_added_columns(conn)  # idempotent
        cols = {c["name"] for c in inspect(conn).get_columns("beta_signup")}
        idx = {i["name"] for i in inspect(conn).get_indexes("beta_signup")}
        kept = conn.execute(text("SELECT first_name FROM beta_signup")).scalar()
    assert "download_token" in cols
    assert "ix_beta_signup_download_token" in idx
    assert kept == "A"
