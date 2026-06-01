# SPDX-License-Identifier: AGPL-3.0-or-later
"""Shared test fixtures: in-memory DB engine, session, user, and HTTP client.

Uses a single shared in-memory SQLite connection (StaticPool) so the session
fixture and the request-scoped session see the same data. The HTTP client
overrides get_session / get_current_user so routes run against the test DB.
"""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user
from app.database import get_session
from app.main import create_app
from app.models.user import User

TEST_EMAIL = "test@example.com"


@pytest.fixture
async def engine():
    eng = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with eng.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest.fixture
async def session(engine):
    # expire_on_commit=False: the test shares one session with the request
    # handlers; the sync cycle engine reads ORM attributes after commits, which
    # would otherwise trigger a lazy reload (IO) outside the async greenlet.
    async with AsyncSession(engine, expire_on_commit=False) as s:
        yield s


@pytest.fixture
async def user(session: AsyncSession) -> User:
    u = User(email=TEST_EMAIL)
    session.add(u)
    await session.commit()
    await session.refresh(u)
    return u


@pytest.fixture
async def client(session: AsyncSession, user: User):
    app = create_app()

    async def _override_session():
        yield session

    async def _override_user():
        return user

    app.dependency_overrides[get_session] = _override_session
    app.dependency_overrides[get_current_user] = _override_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
