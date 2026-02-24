# SPDX-License-Identifier: AGPL-3.0-or-later
"""
HerDay Backend - FastAPI application.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_db_and_tables
from app.routers import auth, cycles, events, phases, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create DB tables on startup."""
    await create_db_and_tables()
    yield


def create_app() -> FastAPI:
    """FastAPI application factory."""
    app = FastAPI(
        title="HerDay API",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router)
    app.include_router(events.router)
    app.include_router(cycles.router)
    app.include_router(phases.router)
    app.include_router(users.router)

    @app.get("/api/health")
    async def health():
        return {"status": "ok"}

    return app


app = create_app()
