# SPDX-License-Identifier: AGPL-3.0-or-later
"""Unit tests for the cycle inference engine.

Uses an in-memory SQLite database so tests are fast and self-contained.
"""

import json
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
    PARENT_OF_SUBPHASE,
    Phase,
    SystemState,
    calculate_phase,
    get_system_state,
    parent_phase_of,
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


def test_phase_calculation_post_menstrual():
    """After period ends, before the pre-ovulatory window, should be POST_MENSTRUAL."""
    cycles = _make_cycles_for_phase_tests()
    # Day 8 of cycle (Jan 8) -- period_duration=5, ovulation_day=14.
    # ovu_window_start=12, pre_ovulatory starts at 12-2=10; day 8 < 10 -> POST_MENSTRUAL
    info = calculate_phase(date(2026, 1, 8), cycles)
    assert info["phase"] == Phase.POST_MENSTRUAL.value
    assert info["day_in_cycle"] == 8


def test_phase_calculation_pre_ovulatory():
    """The 2 days just before the fertile window should be PRE_OVULATORY."""
    cycles = _make_cycles_for_phase_tests()
    # Day 11 of cycle -- ovu_window_start=12, pre_ovulatory = days 10..11
    info = calculate_phase(date(2026, 1, 11), cycles)
    assert info["phase"] == Phase.PRE_OVULATORY.value
    assert info["day_in_cycle"] == 11


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


def test_phase_calculation_post_ovulatory():
    """After the ovulation window, before the PMS window, should be POST_OVULATORY."""
    cycles = _make_cycles_for_phase_tests()
    # Day 20 of cycle (Jan 20) -- after ovu_window_end (16), before pre_menstrual_start (23)
    info = calculate_phase(date(2026, 1, 20), cycles)
    assert info["phase"] == Phase.POST_OVULATORY.value
    assert info["day_in_cycle"] == 20


def test_phase_calculation_pre_menstrual():
    """The last 6 days of the cycle should be PRE_MENSTRUAL (PMS window)."""
    cycles = _make_cycles_for_phase_tests()
    # Day 25 of cycle -- pre_menstrual_start = 28-6+1 = 23; day 25 >= 23 -> PRE_MENSTRUAL
    info = calculate_phase(date(2026, 1, 25), cycles)
    assert info["phase"] == Phase.PRE_MENSTRUAL.value
    assert info["day_in_cycle"] == 25


# ---------------------------------------------------------------------------
# Tests: parent-phase mapping
# ---------------------------------------------------------------------------


def test_parent_phase_mapping():
    """Every sub-phase maps to exactly one of the four parent phases."""
    assert parent_phase_of(Phase.MENSTRUATION) == "menstrual"
    assert parent_phase_of(Phase.POST_MENSTRUAL) == "follicular"
    assert parent_phase_of(Phase.PRE_OVULATORY) == "follicular"
    assert parent_phase_of(Phase.OVULATION) == "ovulatory"
    assert parent_phase_of(Phase.POST_OVULATORY) == "luteal"
    assert parent_phase_of(Phase.PRE_MENSTRUAL) == "luteal"
    # accepts the string value too
    assert parent_phase_of("menstruation") == "menstrual"
    # all six sub-phases are covered
    assert set(PARENT_OF_SUBPHASE.keys()) == set(Phase)


# ---------------------------------------------------------------------------
# Tests: phase override (display correction)
# ---------------------------------------------------------------------------


def test_calculate_phase_without_override_flags():
    """Without an override, the flags reflect the pure estimate."""
    cycles = _make_cycles_for_phase_tests()
    info = calculate_phase(date(2026, 1, 3), cycles)
    assert info["is_override"] is False
    assert info["estimated_phase"] == Phase.MENSTRUATION.value
    assert info["parent_phase"] == "menstrual"


def test_calculate_phase_with_override():
    """An override forces the phase but preserves day_in_cycle and the estimate."""
    cycles = _make_cycles_for_phase_tests()
    info = calculate_phase(
        date(2026, 1, 3),
        cycles,
        overrides={date(2026, 1, 3): Phase.PRE_MENSTRUAL},
    )
    assert info["phase"] == Phase.PRE_MENSTRUAL.value
    assert info["is_override"] is True
    assert info["estimated_phase"] == Phase.MENSTRUATION.value
    assert info["parent_phase"] == "luteal"
    assert info["day_in_cycle"] == 3  # day-in-cycle unaffected by the override


async def test_cycle_length_info_applies(session: AsyncSession, user: User):
    """A cycle_length_info event applies its metadata length (regression: the
    engine used to read the SQLAlchemy-reserved ``metadata`` attribute)."""
    session.add(_make_event(user.id, "period_started", date(2026, 1, 1)))
    session.add(
        Event(
            user_id=user.id,
            event_type="cycle_length_info",
            event_date=date(2026, 1, 2),
            metadata_json=json.dumps({"cycle_length": 30}),
        )
    )
    await session.flush()

    cycles = await recalculate_cycles(user.id, session)
    confirmed = [c for c in cycles if c.source == "confirmed"]
    assert confirmed[0].cycle_length == 30


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
