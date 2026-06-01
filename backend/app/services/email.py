# SPDX-License-Identifier: AGPL-3.0-or-later
"""Email service for sending magic link authentication emails."""

import logging
from email.message import EmailMessage

import aiosmtplib

from app.config import settings

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
        "fr": f"Code HerDay : {token}",
        "en": f"HerDay code: {token}",
    }
    bodies = {
        "fr": (
            f"Bonjour,\n\n"
            f"Votre code de connexion HerDay :\n\n"
            f"    {token}\n\n"
            f"Saisissez-le dans l'application pour vous connecter.\n\n"
            f"Ou cliquez sur ce lien si vous êtes sur navigateur :\n"
            f"{link}\n\n"
            f"Ce code expire dans {settings.MAGIC_LINK_EXPIRE_MINUTES} minutes.\n\n"
            f"Si vous n'avez pas demandé ce code, ignorez cet email."
        ),
        "en": (
            f"Hello,\n\n"
            f"Your HerDay login code:\n\n"
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

    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = email
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
