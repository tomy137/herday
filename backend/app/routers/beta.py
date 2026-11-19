# SPDX-License-Identifier: AGPL-3.0-or-later
"""Public beta routes: /welcome page config, tester sign-up, Android APK download.

Install links (APK, TestFlight) are only handed out by the sign-up: the APK URL carries
the tester's personal token, and /download without a valid token sends back to /welcome.
"""

import logging
import secrets
from pathlib import Path

import aiosmtplib
from fastapi import APIRouter, Depends, status
from fastapi.responses import FileResponse, RedirectResponse
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import settings
from app.database import get_session
from app.models.beta_signup import BetaSignup
from app.schemas.beta import BetaConfig, BetaSignupCreate, BetaSignupResult
from app.services.email import send_beta_signup_notification

logger = logging.getLogger(__name__)

router = APIRouter(tags=["beta"])

APK_MEDIA_TYPE = "application/vnd.android.package-archive"
APK_ROUTE = "/download/herdays.apk"


def _apk_path() -> Path:
    return Path(settings.ANDROID_APK_PATH)


@router.get("/api/beta/config", response_model=BetaConfig)
async def beta_config():
    """What the /welcome page can promise before the sign-up (no links)."""
    return BetaConfig(
        testflight_available=bool(settings.TESTFLIGHT_URL),
        android_apk_available=_apk_path().is_file(),
    )


@router.post("/api/beta/signup", status_code=status.HTTP_201_CREATED, response_model=BetaSignupResult)
async def beta_signup(
    body: BetaSignupCreate,
    session: AsyncSession = Depends(get_session),
):
    """Record a tester and hand out the install links; re-submitting updates the entry."""
    if body.website:
        # Honeypot filled: a bot. Answer like a success, store nothing, give no link.
        return BetaSignupResult(detail="beta.signup_ok", download_url=None, testflight_url=None)

    email = body.email.lower()
    result = await session.exec(select(BetaSignup).where(BetaSignup.email == email))
    signup = result.first()
    if signup is None:
        signup = BetaSignup(email=email, first_name=body.first_name, platform=body.platform)
    signup.first_name = body.first_name
    signup.platform = body.platform
    signup.source = body.source
    signup.message = body.message
    if not signup.download_token:
        signup.download_token = secrets.token_urlsafe(24)
    session.add(signup)
    await session.commit()
    # The commit expires the attributes: reload them here (async), not lazily in the email.
    await session.refresh(signup)

    try:
        await send_beta_signup_notification(signup)
    except (aiosmtplib.SMTPException, OSError):
        # The sign-up is saved; a missing notification must not fail it.
        logger.exception("Beta sign-up notification could not be sent")

    return BetaSignupResult(
        detail="beta.signup_ok",
        download_url=f"{APK_ROUTE}?token={signup.download_token}" if _apk_path().is_file() else None,
        testflight_url=settings.TESTFLIGHT_URL or None,
    )


@router.api_route(APK_ROUTE, methods=["GET", "HEAD"])
async def download_apk(
    token: str | None = None,
    session: AsyncSession = Depends(get_session),
):
    """Latest Android build for direct install, for signed-up testers only."""
    path = _apk_path()
    signup = None
    if token:
        result = await session.exec(select(BetaSignup).where(BetaSignup.download_token == token))
        signup = result.first()
    if signup is None or not path.is_file():
        return RedirectResponse("/welcome#inscription", status_code=status.HTTP_303_SEE_OTHER)
    return FileResponse(path, media_type=APK_MEDIA_TYPE, filename="HerDays.apk")
