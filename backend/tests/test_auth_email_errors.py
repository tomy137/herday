# SPDX-License-Identifier: AGPL-3.0-or-later
"""Magic link request: SMTP failures map to clear API errors instead of a 500."""

from unittest.mock import AsyncMock, patch

import aiosmtplib


async def test_rejected_address_returns_400(client):
    refused = aiosmtplib.SMTPRecipientsRefused(
        [aiosmtplib.SMTPRecipientRefused(556, "nullMX", "x@example.com")]
    )
    with patch("app.routers.auth.send_magic_link_email", new=AsyncMock(side_effect=refused)):
        res = await client.post("/api/auth/magic-link", json={"email": "x@example.com"})
    assert res.status_code == 400
    assert res.json()["detail"] == "error.email_rejected"


async def test_smtp_outage_returns_503(client):
    down = aiosmtplib.SMTPConnectError("connection refused")
    with patch("app.routers.auth.send_magic_link_email", new=AsyncMock(side_effect=down)):
        res = await client.post("/api/auth/magic-link", json={"email": "y@example.com"})
    assert res.status_code == 503
    assert res.json()["detail"] == "error.email_send_failed"
