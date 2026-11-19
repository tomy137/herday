# SPDX-License-Identifier: AGPL-3.0-or-later
"""Email service for sending magic link authentication emails."""

import logging
from email.message import EmailMessage
from typing import TYPE_CHECKING

import aiosmtplib

from app.config import settings

if TYPE_CHECKING:
    from app.models.beta_signup import BetaSignup

logger = logging.getLogger(__name__)


async def send_magic_link_email(
    email: str,
    token: str,
    locale: str = "fr",
) -> None:
    """Send a login email with a 6-digit code and a clickable verify link.

    If SMTP is not configured, logs the code/link instead of sending.
    """
    link = (
        f"{settings.FRONTEND_URL}/verify"
        f"?token={token}&email={email}"
    )

    subjects = {
        "fr": f"Code HerDays : {token}",
        "en": f"HerDays code: {token}",
    }
    bodies = {
        "fr": (
            f"Bonjour,\n\n"
            f"Votre code de connexion HerDays :\n\n"
            f"    {token}\n\n"
            f"Saisissez-le dans l'application pour vous connecter.\n\n"
            f"Ou cliquez sur ce lien si vous êtes sur navigateur :\n"
            f"{link}\n\n"
            f"Ce code expire dans {settings.MAGIC_LINK_EXPIRE_MINUTES} minutes.\n\n"
            f"Si vous n'avez pas demandé ce code, ignorez cet email."
        ),
        "en": (
            f"Hello,\n\n"
            f"Your HerDays login code:\n\n"
            f"    {token}\n\n"
            f"Enter it in the app to sign in.\n\n"
            f"Or click this link if you're on a browser:\n"
            f"{link}\n\n"
            f"This code expires in {settings.MAGIC_LINK_EXPIRE_MINUTES} minutes.\n\n"
            f"If you did not request this code, please ignore this email."
        ),
    }

    subject = subjects.get(locale, subjects["fr"])
    body = bodies.get(locale, bodies["fr"])

    if not settings.SMTP_HOST:
        logger.warning("SMTP not configured — code printed to console")
        print("\n" + "=" * 60)
        print(f"  LOGIN CODE for {email}: {token}")
        print(f"  Link: {link}")
        print("=" * 60 + "\n")
        return

    await _send(email, subject, body)


async def send_beta_signup_notification(signup: "BetaSignup") -> None:
    """Tell the maintainer (BETA_NOTIFY_EMAIL) that someone signed up on /welcome."""
    if not settings.BETA_NOTIFY_EMAIL:
        return
    platform = {"ios": "iPhone", "android": "Android"}.get(signup.platform, signup.platform)
    body = (
        f"Nouvelle inscription à la bêta HerDays :\n\n"
        f"Prénom : {signup.first_name}\n"
        f"E-mail : {signup.email}\n"
        f"Téléphone : {platform}\n"
        f"Connu par : {signup.source or '—'}\n\n"
        f"Message :\n{signup.message or '—'}\n"
    )
    if not settings.SMTP_HOST:
        logger.warning("SMTP not configured — beta sign-up notification printed to console")
        print(body)
        return
    await _send(settings.BETA_NOTIFY_EMAIL, f"HerDays bêta : {signup.first_name} ({platform})", body)


async def _send(to: str, subject: str, body: str) -> None:
    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    await aiosmtplib.send(
        message,
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USER,
        password=settings.SMTP_PASSWORD,
        use_tls=settings.SMTP_USE_TLS,
        start_tls=not settings.SMTP_USE_TLS,
    )
