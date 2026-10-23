# SPDX-License-Identifier: AGPL-3.0-or-later
"""Partner profile fields (v0.3) and the additive column backfill."""

from sqlalchemy import create_engine, text

from app.database import _ensure_added_columns


async def test_profile_defaults(client):
    res = await client.get("/api/users/me")
    assert res.status_code == 200
    body = res.json()
    assert body["partner_nickname"] is None
    assert body["partner_pronouns"] == "elle"
    assert body["expertise_level"] is None
    assert body["contraception"] is None


async def test_profile_update_and_clear_nickname(client):
    res = await client.patch(
        "/api/users/me",
        json={
            "partner_nickname": "  Lou  ",
            "partner_pronouns": "iel",
            "expertise_level": "decouverte",
            "contraception": "oui",
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["partner_nickname"] == "Lou"
    assert body["partner_pronouns"] == "iel"
    assert body["expertise_level"] == "decouverte"
    assert body["contraception"] == "oui"

    res = await client.patch("/api/users/me", json={"partner_nickname": ""})
    assert res.json()["partner_nickname"] is None
    # Untouched fields keep their value.
    assert res.json()["partner_pronouns"] == "iel"


async def test_profile_rejects_invalid_values(client):
    for payload in (
        {"partner_pronouns": "they"},
        {"expertise_level": "pro"},
        {"contraception": "peut-être"},
        {"partner_nickname": "x" * 41},
    ):
        res = await client.patch("/api/users/me", json=payload)
        assert res.status_code == 422, payload


def test_backfill_keeps_existing_rows():
    """A pre-v0.3 user table gains the new columns without losing its rows."""
    eng = create_engine("sqlite://")
    with eng.begin() as conn:
        conn.exec_driver_sql(
            'CREATE TABLE "user" (id VARCHAR PRIMARY KEY, email VARCHAR, locale VARCHAR)'
        )
        conn.exec_driver_sql("INSERT INTO \"user\" VALUES ('u1', 'a@b.c', 'fr')")
        _ensure_added_columns(conn)
        # Idempotent: a second startup must not fail.
        _ensure_added_columns(conn)
        row = conn.execute(
            text('SELECT email, partner_pronouns, partner_nickname, contraception FROM "user"')
        ).one()
    assert row == ("a@b.c", "elle", None, None)
