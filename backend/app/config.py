# SPDX-License-Identifier: AGPL-3.0-or-later
"""Application configuration via environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    DATABASE_URL: str = "sqlite+aiosqlite:///./herday.db"

    SECRET_KEY: str = "change-me-in-production"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USE_TLS: bool = False
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""

    MAGIC_LINK_EXPIRE_MINUTES: int = 15

    FRONTEND_URL: str = "http://localhost:5173"
    CORS_ORIGINS: list[str] = ["http://localhost:5173"]
    COOKIE_SECURE: bool = False  # Set True in production (HTTPS)

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
