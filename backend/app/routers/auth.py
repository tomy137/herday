# SPDX-License-Identifier: AGPL-3.0-or-later
"""Authentication routes: magic link flow + JWT management."""

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from jose import JWTError
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import settings
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.database import get_session
from app.schemas.auth import MagicLinkRequest, RefreshRequest, TokenResponse, VerifyRequest
from app.services.auth import generate_magic_link, verify_magic_link
from app.services.email import send_magic_link_email

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Cross-origin cookies (Capacitor webview → backend) require SameSite=None + Secure.
# Plain HTTP dev keeps "lax" since "none" mandates Secure=true.
COOKIE_SAMESITE: str = "none" if settings.COOKIE_SECURE else "lax"


@router.post("/magic-link", status_code=status.HTTP_202_ACCEPTED)
async def request_magic_link(
    body: MagicLinkRequest,
    session: AsyncSession = Depends(get_session),
):
    """Send a magic link to the given email address."""
    token = await generate_magic_link(body.email, session)
    await send_magic_link_email(body.email, token)
    return {"detail": "auth.magic_link_sent"}


@router.post("/verify", response_model=TokenResponse)
async def verify(
    body: VerifyRequest,
    response: Response,
    session: AsyncSession = Depends(get_session),
):
    """Verify a magic link token and set authentication cookies."""
    user = await verify_magic_link(body.token, body.email, session)

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )

    # Native clients (Capacitor) can't rely on cross-origin cookies in WKWebView.
    # Returning tokens in the body lets them store + send via Authorization header.
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    body: RefreshRequest | None = None,
    cookie_refresh_token: str | None = Cookie(default=None, alias="refresh_token"),
):
    """Issue a new access token using the refresh token (cookie or body)."""
    refresh_token = (body.refresh_token if body else None) or cookie_refresh_token
    if refresh_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="error.no_refresh_token",
        )

    try:
        payload = decode_token(refresh_token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="error.invalid_refresh_token",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="error.invalid_token_type",
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="error.invalid_refresh_token",
        )

    new_access_token = create_access_token(user_id)

    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return TokenResponse(access_token=new_access_token, refresh_token=refresh_token)


@router.post("/logout")
async def logout(response: Response):
    """Clear authentication cookies."""
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"detail": "auth.logged_out"}
