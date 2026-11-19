# SPDX-License-Identifier: AGPL-3.0-or-later
"""Public beta routes: /welcome page config, tester sign-up, Android APK download."""

import logging
from pathlib import Path

import aiosmtplib
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import settings
from app.database import get_session
from app.models.beta_signup import BetaSignup
from app.schemas.beta import BetaConfig, BetaSignupCreate
from app.services.email import send_beta_signup_notification

logger = logging.getLogger(__name__)

router = APIRouter(tags=["beta"])

APK_MEDIA_TYPE = "application/vnd.android.package-archive"


def _apk_path() -> Path:
    return Path(settings.ANDROID_APK_PATH)


@router.get("/api/beta/config", response_model=BetaConfig)
async def beta_config():
    """Links the /welcome page can show (TestFlight public link, APK)."""
    return BetaConfig(
        testflight_url=settings.TESTFLIGHT_URL or None,
        android_apk_available=_apk_path().is_file(),
    )


@router.post("/api/beta/signup", status_code=status.HTTP_201_CREATED)
async def beta_signup(
    body: BetaSignupCreate,
    session: AsyncSession = Depends(get_session),
):
    """Record a tester; re-submitting with the same email updates the entry."""
    if body.website:
        # Honeypot filled: a bot. Answer like a success, store nothing.
        return {"detail": "beta.signup_ok"}

    email = body.email.lower()
    result = await session.exec(select(BetaSignup).where(BetaSignup.email == email))
    signup = result.first()
    if signup is None:
        signup = BetaSignup(email=email, first_name=body.first_name, platform=body.platform)
    signup.first_name = body.first_name
    signup.platform = body.platform
    signup.source = body.source
    signup.message = body.message
    session.add(signup)
    await session.commit()
    # The commit expires the attributes: reload them here (async), not lazily in the email.
    await session.refresh(signup)

    try:
        await send_beta_signup_notification(signup)
    except (aiosmtplib.SMTPException, OSError):
        # The sign-up is saved; a missing notification must not fail it.
        logger.exception("Beta sign-up notification could not be sent")

    return {"detail": "beta.signup_ok"}


@router.api_route("/download/herdays.apk", methods=["GET", "HEAD"])
async def download_apk():
    """Latest Android build for direct install (sideloading)."""
    path = _apk_path()
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="error.apk_unavailable")
    return FileResponse(path, media_type=APK_MEDIA_TYPE, filename="HerDays.apk")
