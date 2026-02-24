# SPDX-License-Identifier: AGPL-3.0-or-later
"""Unit tests for the cycle inference engine.

Uses an in-memory SQLite database so tests are fast and self-contained.
"""

import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.cycle import Cycle
from app.models.event import Event
from app.models.user import User
from app.services.cycle_engine import (
    DEFAULT_CYCLE_LENGTH,
    DEFAULT_PERIOD_DURATION,
    LUTEAL_PHASE_LENGTH,
    Phase,
    SystemState,
    calculate_phase,
    get_system_state,
    recalculate_cycles,
)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

TEST_ENGINE = create_async_engine("sqlite+aiosqlite://", echo=False)


@pytest.fixture(autouse=True)
async def setup_db():
    """Create tables before each test and drop them after."""
    async with TEST_ENGINE.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with TEST_ENGINE.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


@pytest.fixture
async def session():
    """Provide an async session bound to the in-memory engine."""
    async with AsyncSession(TEST_ENGINE) as s:
        yield s


@pytest.fixture
async def user(session: AsyncSession) -> User:
    """Create a test user."""
    u = User(email="test@example.com")
    session.add(u)
    await session.commit()
    await session.refresh(u)
    return u


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_event(
    user_id: uuid.UUID,
    event_type: str,
    event_date: date,
    confidence: float = 1.0,
) -> Event:
    return Event(
        user_id=user_id,
        event_type=event_type,
        event_date=event_date,
        confidence=confidence,
    )


# ---------------------------------------------------------------------------
# Tests: system state
# ---------------------------------------------------------------------------


async def test_no_events_returns_unknown(session: AsyncSession, user: User):
    """With no events, recalculate produces no cycles and state is UNKNOWN."""
    cycles = await recalculate_cycles(user.id, session)
    assert cycles == []
    assert get_system_state(cycles) == SystemState.UNKNOWN


async def test_single_period_started_creates_cycle(
    session: AsyncSession,
    user: User,
):
    """A single period_started event creates one confirmed cycle."""
    event = _make_event(user.id, "period_started", date(2026, 1, 1))
    session.add(event)
    await session.flush()

    cycles = await recalculate_cycles(user.id, session)

    assert len(cycles) == 1
    assert cycles[0].source == "confirmed"
    assert cycles[0].start_date == date(2026, 1, 1)
    assert get_system_state(cycles) == SystemState.PARTIAL


async def test_period_started_and_ended(session: AsyncSession, user: User):
    """period_started + period_ended sets the period_duration correctly."""
    session.add(_make_event(user.id, "period_started", date(2026, 1, 1)))
    session.add(_make_event(user.id, "period_ended", date(2026, 1, 5)))
    await session.flush()

    cycles = await recalculate_cycles(user.id, session)

    assert len(cycles) == 1
    assert cycles[0].period_duration == 5  # Jan 1 to Jan 5 inclusive


async def test_two_cycles_learning_state(session: AsyncSession, user: User):
    """Two period_started events produce two cycles in LEARNING state."""
    session.add(_make_event(user.id, "period_started", date(2026, 1, 1)))
    session.add(_make_event(user.id, "period_started", date(2026, 1, 29)))
    await session.flush()

    cycles = await recalculate_cycles(user.id, session)

    assert len(cycles) == 2
    assert get_system_state(cycles) == SystemState.LEARNING
    # First cycle should have cycle_length = 28
    assert cycles[0].cycle_length == 28


async def test_three_cycles_confident_state(session: AsyncSession, user: User):
    """Three confirmed cycles produce CONFIDENT state."""
    session.add(_make_event(user.id, "period_started", date(2026, 1, 1)))
    session.add(_make_event(user.id, "period_started", date(2026, 1, 29)))
    session.add(_make_event(user.id, "period_started", date(2026, 2, 26)))
    await session.flush()

    cycles = await recalculate_cycles(user.id, session)

    assert len(cycles) == 3
    assert get_system_state(cycles) == SystemState.CONFIDENT


# ---------------------------------------------------------------------------
# Tests: phase calculation
# ---------------------------------------------------------------------------


def _make_cycles_for_phase_tests() -> list[Cycle]:
    """Helper: create cycles for phase calculation tests.

    Cycle starts Jan 1, 28-day cycle, 5-day period.
    """
    uid = uuid.uuid4()
    return [
        Cycle(
            user_id=uid,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 1, 28),
            period_duration=5,
            cycle_length=28,
            source="confirmed",
            confidence=1.0,
        ),
        Cycle(
            user_id=uid,
            start_date=date(2026, 1, 29),
            period_duration=5,
            cycle_length=28,
            source="confirmed",
            confidence=1.0,
        ),
        Cycle(
            user_id=uid,
            start_date=date(2026, 2, 26),
            period_duration=5,
            source="confirmed",
            confidence=1.0,
        ),
    ]


def test_phase_calculation_menstruation():
    """Day 1-5 should be MENSTRUATION phase."""
    cycles = _make_cycles_for_phase_tests()
    # Day 3 of the cycle (Jan 3)
    info = calculate_phase(date(2026, 1, 3), cycles)
    assert info["phase"] == Phase.MENSTRUATION.value
    assert info["day_in_cycle"] == 3


def test_phase_calculation_follicular():
    """After period ends, before ovulation window, should be FOLLICULAR."""
    cycles = _make_cycles_for_phase_tests()
    # Day 8 of cycle (Jan 8) -- period_duration=5, ovulation_day=14
    # day 8 is between 6 (period_duration+1) and 12 (ovulation_day-2)
    info = calculate_phase(date(2026, 1, 8), cycles)
    assert info["phase"] == Phase.FOLLICULAR.value
    assert info["day_in_cycle"] == 8


def test_phase_calculation_ovulation():
    """Ovulation window: ovulation_day-2 to ovulation_day+2.

    With cycle_length=28, ovulation_day = 28 - 14 = 14.
    Window: day 12 to day 16.
    """
    cycles = _make_cycles_for_phase_tests()
    # Day 14 of cycle (Jan 14)
    info = calculate_phase(date(2026, 1, 14), cycles)
    assert info["phase"] == Phase.OVULATION.value
    assert info["day_in_cycle"] == 14


def test_phase_calculation_luteal():
    """After ovulation window until end of cycle should be LUTEAL."""
    cycles = _make_cycles_for_phase_tests()
    # Day 20 of cycle (Jan 20) -- after ovulation_day+2 (16)
    info = calculate_phase(date(2026, 1, 20), cycles)
    assert info["phase"] == Phase.LUTEAL.value
    assert info["day_in_cycle"] == 20


# ---------------------------------------------------------------------------
# Tests: event deletion recalculation
# ---------------------------------------------------------------------------


async def test_delete_event_recalculates(session: AsyncSession, user: User):
    """Deleting an event and recalculating should update cycles."""
    e1 = _make_event(user.id, "period_started", date(2026, 1, 1))
    e2 = _make_event(user.id, "period_started", date(2026, 1, 29))
    session.add(e1)
    session.add(e2)
    await session.flush()

    cycles = await recalculate_cycles(user.id, session)
    assert len(cycles) == 2

    # Delete second event
    await session.delete(e2)
    await session.flush()

    cycles = await recalculate_cycles(user.id, session)
    assert len(cycles) == 1
    assert cycles[0].start_date == date(2026, 1, 1)


# ---------------------------------------------------------------------------
# Tests: inferred cycles from period_predicted
# ---------------------------------------------------------------------------


async def test_period_predicted_adjusts_next_cycle(
    session: AsyncSession,
    user: User,
):
    """A period_predicted event creates an inferred cycle with lower confidence."""
    session.add(
        _make_event(user.id, "period_predicted", date(2026, 1, 15), confidence=0.6),
    )
    await session.flush()

    cycles = await recalculate_cycles(user.id, session)

    assert len(cycles) == 1
    assert cycles[0].source == "inferred"
    assert cycles[0].confidence == pytest.approx(0.3)  # 0.6 * 0.5
    assert get_system_state(cycles) == SystemState.ESTIMATING
