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
    """Send a magic link email to the user.

    The link points to ``FRONTEND_URL/verify?token=xxx&email=yyy``.
    If SMTP is not configured, logs the link instead of sending.
    """
    link = (
        f"{settings.FRONTEND_URL}/verify"
        f"?token={token}&email={email}"
    )

    # Subjects and bodies by locale
    subjects = {
        "fr": "Votre lien de connexion HerDay",
        "en": "Your HerDay login link",
    }
    bodies = {
        "fr": (
            f"Bonjour,\n\n"
            f"Cliquez sur le lien ci-dessous pour vous connecter a HerDay :\n\n"
            f"{link}\n\n"
            f"Ce lien expire dans {settings.MAGIC_LINK_EXPIRE_MINUTES} minutes.\n\n"
            f"Si vous n'avez pas demande ce lien, ignorez cet email."
        ),
        "en": (
            f"Hello,\n\n"
            f"Click the link below to sign in to HerDay:\n\n"
            f"{link}\n\n"
            f"This link expires in {settings.MAGIC_LINK_EXPIRE_MINUTES} minutes.\n\n"
            f"If you did not request this link, please ignore this email."
        ),
    }

    subject = subjects.get(locale, subjects["fr"])
    body = bodies.get(locale, bodies["fr"])

    if not settings.SMTP_HOST:
        logger.warning("SMTP not configured — magic link printed to console")
        print("\n" + "=" * 60)
        print(f"  MAGIC LINK for {email}")
        print(f"  {link}")
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
