# SPDX-License-Identifier: AGPL-3.0-or-later
"""
Cycle inference engine -- the core of HerDay.

This module deduces menstrual cycles from user-reported events, calculates
the current phase, and provides calendar projections.

The algorithm uses the **Ogino method** (calendar-based) as its foundation:
- The luteal phase is assumed to be a fixed 14 days.
- Ovulation is estimated at cycle_length - 14.
- Phase boundaries are derived from that anchor.

See also: docs/CYCLE_ENGINE.md
"""

import calendar
import json
import uuid
from datetime import date, timedelta
from enum import Enum

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.cycle import Cycle
from app.models.event import Event
from app.models.journal import JournalEntry

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEFAULT_CYCLE_LENGTH = 28
DEFAULT_PERIOD_DURATION = 5
LUTEAL_PHASE_LENGTH = 14  # Ogino method constant
MIN_CYCLE_LENGTH = 18     # Biological minimum for cycle length
MAX_CYCLE_LENGTH = 45     # Above this, a "cycle" is almost certainly a missed log


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class SystemState(str, Enum):
    """How confident the system is in its predictions."""

    UNKNOWN = "unknown"          # No confirmed cycles at all
    ESTIMATING = "estimating"    # Weak signals only (e.g. period_predicted)
    PARTIAL = "partial"          # 1 confirmed cycle
    LEARNING = "learning"        # 2 confirmed cycles
    CONFIDENT = "confident"      # 3+ confirmed cycles


class Phase(str, Enum):
    """Menstrual cycle phase (6 sub-phases for nuanced tracking)."""

    MENSTRUATION = "menstruation"
    POST_MENSTRUAL = "post_menstrual"      # flat low energy, recovery
    PRE_OVULATORY = "pre_ovulatory"        # estrogen rising, energy ascending
    OVULATION = "ovulation"                # fertile window
    POST_OVULATORY = "post_ovulatory"      # stable high, productive
    PRE_MENSTRUAL = "pre_menstrual"        # PMS window


# Four "parent" phases group the six sub-phases. Used only for the cross-cycle
# memory (échos) aggregation — never shown directly as a phase in the UI.
PARENT_OF_SUBPHASE: dict[Phase, str] = {
    Phase.MENSTRUATION: "menstrual",
    Phase.POST_MENSTRUAL: "follicular",
    Phase.PRE_OVULATORY: "follicular",
    Phase.OVULATION: "ovulatory",
    Phase.POST_OVULATORY: "luteal",
    Phase.PRE_MENSTRUAL: "luteal",
}


def parent_phase_of(phase: Phase | str) -> str:
    """Return the parent-phase key for a sub-phase (enum or its value)."""
    if isinstance(phase, str):
        phase = Phase(phase)
    return PARENT_OF_SUBPHASE[phase]


# ---------------------------------------------------------------------------
# Cycle recalculation
# ---------------------------------------------------------------------------


async def recalculate_cycles(
    user_id: uuid.UUID,
    session: AsyncSession,
) -> list[Cycle]:
    """Rebuild all cycles for a user from their events.

    This is the main entry point: every time an event is added or removed
    we recalculate cycles from scratch so the model stays consistent.

    Algorithm:
    1. Fetch all events ordered by date.
    2. Each ``period_started`` event opens a new confirmed cycle.
    3. A ``period_ended`` event closes the current period (sets duration).
    4. Consecutive cycles get their ``cycle_length`` computed as the
       difference between start dates.
    5. Inferred future cycles are appended using the rolling average.
    """
    # Delete existing cycles for this user
    existing = await session.exec(
        select(Cycle).where(Cycle.user_id == user_id),
    )
    for cycle in existing.all():
        await session.delete(cycle)
    await session.flush()

    # Fetch all events ordered by date
    events_result = await session.exec(
        select(Event)
        .where(Event.user_id == user_id)
        .order_by(Event.event_date),  # type: ignore[arg-type]
    )
    events = events_result.all()

    cycles: list[Cycle] = []
    current_cycle: Cycle | None = None

    for event in events:
        if event.event_type == "period_started":
            # Close previous cycle if open
            if current_cycle is not None:
                current_cycle.end_date = event.event_date - timedelta(days=1)
                current_cycle.cycle_length = (
                    event.event_date - current_cycle.start_date
                ).days

            # Open new confirmed cycle
            current_cycle = Cycle(
                user_id=user_id,
                start_date=event.event_date,
                source="confirmed",
                confidence=event.confidence,
            )
            cycles.append(current_cycle)

        elif event.event_type == "period_ended" and current_cycle is not None:
            duration = (event.event_date - current_cycle.start_date).days + 1
            current_cycle.period_duration = duration

        elif event.event_type == "period_ongoing" and current_cycle is not None:
            # Ongoing period confirms menstruation but doesn't anchor start
            days_since_start = (event.event_date - current_cycle.start_date).days
            if 0 <= days_since_start <= 7:
                current_cycle.confidence = min(1.0, current_cycle.confidence + 0.1)

        elif event.event_type == "cycle_length_info":
            # User-provided cycle length: apply to current cycle or create
            # a lightweight inferred cycle so _average_cycle_length picks it up.
            # NB: read metadata_json — ``event.metadata`` is SQLAlchemy-reserved.
            metadata = json.loads(event.metadata_json) if event.metadata_json else {}
            length = metadata.get("cycle_length")
            if isinstance(length, (int, float)) and 15 <= length <= 50:
                length = int(length)
                if current_cycle is not None and current_cycle.cycle_length is None:
                    current_cycle.cycle_length = length
                else:
                    # Create an inferred "user_provided" cycle
                    inferred = Cycle(
                        user_id=user_id,
                        start_date=event.event_date,
                        cycle_length=length,
                        source="inferred",
                        confidence=0.6,
                    )
                    cycles.append(inferred)

        elif event.event_type == "period_predicted":
            # Weak signal: create an inferred cycle only if no confirmed cycle
            # covers this date already.
            covers = any(
                c.start_date <= event.event_date
                and (c.end_date is None or c.end_date >= event.event_date)
                for c in cycles
            )
            if not covers:
                inferred = Cycle(
                    user_id=user_id,
                    start_date=event.event_date,
                    source="inferred",
                    confidence=event.confidence * 0.5,
                )
                cycles.append(inferred)

    # Sort cycles by start_date (inferred ones may be out of order)
    cycles.sort(key=lambda c: c.start_date)

    # Second pass: compute cycle_length for consecutive cycles where missing
    for i in range(len(cycles) - 1):
        if cycles[i].cycle_length is None:
            cycles[i].cycle_length = (
                cycles[i + 1].start_date - cycles[i].start_date
            ).days
            cycles[i].end_date = cycles[i + 1].start_date - timedelta(days=1)

    # Third pass: split implausibly long cycles. The partner WILL miss logging
    # periods — that's normal — so a span far beyond a normal cycle almost
    # always means one or more skipped logs (a 56-day "cycle" is really ~2
    # cycles). We model such a span as N cycles of typical length: the first
    # keeps the real (confirmed) start, the gap-filled ones are inferred (lower
    # confidence). The timeline stays coherent instead of one stretched cycle,
    # and it self-heals if the missed period is logged later (full recompute).
    typical = _average_cycle_length(cycles)
    rebuilt: list[Cycle] = []
    for c in cycles:
        if (
            c.cycle_length is not None
            and c.cycle_length > MAX_CYCLE_LENGTH
            and c.source == "confirmed"
        ):
            total = c.cycle_length
            n = max(2, round(total / typical))
            for i in range(n):
                offset_start = round(i * total / n)
                offset_end = round((i + 1) * total / n)
                rebuilt.append(Cycle(
                    user_id=user_id,
                    start_date=c.start_date + timedelta(days=offset_start),
                    end_date=c.start_date + timedelta(days=offset_end - 1),
                    period_duration=c.period_duration,
                    cycle_length=offset_end - offset_start,
                    source="confirmed" if i == 0 else "inferred",
                    confidence=c.confidence if i == 0 else round(c.confidence * 0.5, 3),
                ))
        else:
            rebuilt.append(c)
    cycles = sorted(rebuilt, key=lambda c: c.start_date)

    # Fill missing period_duration with default for confirmed cycles
    for cycle in cycles:
        if cycle.period_duration is None and cycle.source == "confirmed":
            avg = _average_period_duration(cycles)
            cycle.period_duration = avg

    # Persist cycles
    for cycle in cycles:
        session.add(cycle)
    await session.flush()

    return cycles


def _average_period_duration(cycles: list[Cycle]) -> int:
    """Compute average period duration from confirmed cycles, or default."""
    durations = [
        c.period_duration
        for c in cycles
        if c.period_duration is not None and c.source == "confirmed"
    ]
    if not durations:
        return DEFAULT_PERIOD_DURATION
    return round(sum(durations) / len(durations))


def _average_cycle_length(cycles: list[Cycle]) -> int:
    """Compute average cycle length from cycles with a *plausible* known length.

    Includes both confirmed and inferred cycles (e.g. from user-provided
    cycle_length_info events) so that user hints influence predictions.

    Only lengths within [MIN_CYCLE_LENGTH, MAX_CYCLE_LENGTH] feed the average:
    a span far above the normal range almost always means a missed period log
    (e.g. a 56-day "cycle" is two cycles with one period unlogged), not a real
    long cycle. Letting such outliers in drags the predicted length — and the
    hormone-graph axis — far too high.
    """
    lengths = [
        c.cycle_length
        for c in cycles
        if c.cycle_length is not None
        and MIN_CYCLE_LENGTH <= c.cycle_length <= MAX_CYCLE_LENGTH
    ]
    if not lengths:
        return DEFAULT_CYCLE_LENGTH
    avg = round(sum(lengths) / len(lengths))
    return min(max(avg, MIN_CYCLE_LENGTH), MAX_CYCLE_LENGTH)


# ---------------------------------------------------------------------------
# System state
# ---------------------------------------------------------------------------


def get_system_state(cycles: list[Cycle]) -> SystemState:
    """Determine confidence level from the set of known cycles.

    A confirmed cycle whose *known* length is below the biological minimum is
    almost always an artefact of a false-alarm re-declaration — two
    ``period_started`` events a few days apart produce a 2-day "cycle". Such a
    span is not a real, independent cycle, so it must never inflate confidence
    (otherwise one mistaken tap jumps us from PARTIAL to LEARNING). Cycles that
    are still open (``cycle_length is None``) keep counting — that is the
    current cycle.
    """
    confirmed = [
        c for c in cycles
        if c.source == "confirmed"
        and (c.cycle_length is None or c.cycle_length >= MIN_CYCLE_LENGTH)
    ]
    inferred = [c for c in cycles if c.source == "inferred"]

    if not confirmed and not inferred:
        return SystemState.UNKNOWN
    if not confirmed and inferred:
        return SystemState.ESTIMATING
    if len(confirmed) == 1:
        return SystemState.PARTIAL
    if len(confirmed) == 2:
        return SystemState.LEARNING
    return SystemState.CONFIDENT


# ---------------------------------------------------------------------------
# Phase calculation
# ---------------------------------------------------------------------------

# Confidence scores per system state
_STATE_CONFIDENCE: dict[SystemState, float] = {
    SystemState.UNKNOWN: 0.0,
    SystemState.ESTIMATING: 0.2,
    SystemState.PARTIAL: 0.4,
    SystemState.LEARNING: 0.7,
    SystemState.CONFIDENT: 0.9,
}


def calculate_phase(
    target_date: date,
    cycles: list[Cycle],
    events: list[Event] | None = None,
) -> dict:
    """Calculate the menstrual phase for a given date.

    Returns a dict matching the PhaseInfo schema: phase, day_in_cycle,
    cycle_length, confidence, system_state, next_period_in, phase_ends_in,
    tips, and parent_phase (the 4-phase grouping used by the échos).
    """
    from app.services.phase import get_tips_for_phase

    state = get_system_state(cycles)

    if state == SystemState.UNKNOWN:
        phase = Phase.POST_MENSTRUAL
        return {
            "phase": phase.value,
            "day_in_cycle": 0,
            "cycle_length": DEFAULT_CYCLE_LENGTH,
            "confidence": 0.0,
            "system_state": state.value,
            "next_period_in": None,
            "phase_ends_in": None,
            "tips": get_tips_for_phase(phase),
            "parent_phase": PARENT_OF_SUBPHASE[phase],
        }

    avg_cycle_length = _average_cycle_length(cycles)
    avg_period_duration = _average_period_duration(cycles)

    # Find the most recent cycle whose start_date <= target_date
    past_cycles = [c for c in cycles if c.start_date <= target_date]
    if not past_cycles:
        # target_date is before any known cycle; extrapolate backwards
        first = cycles[0]
        day_in_cycle = (target_date - first.start_date).days % avg_cycle_length
        if day_in_cycle < 0:
            day_in_cycle += avg_cycle_length
        day_in_cycle += 1  # 1-indexed
    else:
        ref_cycle = past_cycles[-1]  # cycles are sorted by start_date
        cycle_length = ref_cycle.cycle_length or avg_cycle_length
        if cycle_length < MIN_CYCLE_LENGTH:
            cycle_length = avg_cycle_length
        day_in_cycle = (target_date - ref_cycle.start_date).days + 1  # 1-indexed

        # If we've gone past the expected cycle length, wrap around
        if day_in_cycle > cycle_length:
            day_in_cycle = ((day_in_cycle - 1) % cycle_length) + 1

    # Determine phase from day_in_cycle
    cycle_length = avg_cycle_length
    period_dur = avg_period_duration
    ovulation_day = cycle_length - LUTEAL_PHASE_LENGTH

    phase = _day_to_phase(day_in_cycle, period_dur, ovulation_day, cycle_length)
    confidence = _STATE_CONFIDENCE[state]

    # Next period
    days_until_next = cycle_length - day_in_cycle + 1
    if days_until_next <= 0:
        days_until_next = 1

    # Days remaining in the current phase (inclusive of today)
    phase_end_day = _phase_end_day(phase, period_dur, ovulation_day, cycle_length)
    phase_ends_in = phase_end_day - day_in_cycle + 1
    if phase_ends_in <= 0:
        phase_ends_in = 1

    return {
        "phase": phase.value,
        "day_in_cycle": day_in_cycle,
        "cycle_length": cycle_length,
        "confidence": confidence,
        "system_state": state.value,
        "next_period_in": days_until_next,
        "phase_ends_in": phase_ends_in,
        "tips": get_tips_for_phase(phase),
        "parent_phase": PARENT_OF_SUBPHASE[phase],
    }


def _phase_end_day(
    phase: Phase,
    period_duration: int,
    ovulation_day: int,
    cycle_length: int,
) -> int:
    """Last day-in-cycle of the given phase (matches _day_to_phase boundaries)."""
    ovu_window_start = ovulation_day - 2
    ovu_window_end = ovulation_day + 2
    pre_menstrual_start = cycle_length - _PRE_MENSTRUAL_DAYS + 1

    if phase == Phase.MENSTRUATION:
        return period_duration
    if phase == Phase.POST_MENSTRUAL:
        return ovu_window_start - _PRE_OVULATORY_DAYS - 1
    if phase == Phase.PRE_OVULATORY:
        return ovu_window_start - 1
    if phase == Phase.OVULATION:
        return ovu_window_end
    if phase == Phase.POST_OVULATORY:
        return pre_menstrual_start - 1
    # PRE_MENSTRUAL
    return cycle_length


_PRE_OVULATORY_DAYS = 2   # days just before the fertile window
_PRE_MENSTRUAL_DAYS = 6   # PMS window before next period


def _day_to_phase(
    day: int,
    period_duration: int,
    ovulation_day: int,
    cycle_length: int,
) -> Phase:
    """Map a 1-indexed day-in-cycle to one of 6 phases.

    Boundaries (28-day cycle, 5-day period, ovulation at day 14):
    - 1..5    MENSTRUATION
    - 6..9    POST_MENSTRUAL  (flat, recovery — 2/3 of the pre-ovu window)
    - 10..11  PRE_OVULATORY   (estrogen rising — 2 days before fertile window)
    - 12..16  OVULATION       (5-day fertile window)
    - 17..22  POST_OVULATORY  (stable luteal — first ~6 days)
    - 23..28  PRE_MENSTRUAL   (PMS — last 6 days)

    Bounds scale with the user's actual cycle_length and period_duration.
    """
    if day <= period_duration:
        return Phase.MENSTRUATION

    ovu_window_start = ovulation_day - 2
    ovu_window_end = ovulation_day + 2

    if day < ovu_window_start:
        pre_ovu_start = ovu_window_start - _PRE_OVULATORY_DAYS
        if day < pre_ovu_start:
            return Phase.POST_MENSTRUAL
        return Phase.PRE_OVULATORY

    if day <= ovu_window_end:
        return Phase.OVULATION

    pre_menstrual_start = cycle_length - _PRE_MENSTRUAL_DAYS + 1
    if day < pre_menstrual_start:
        return Phase.POST_OVULATORY
    return Phase.PRE_MENSTRUAL


# ---------------------------------------------------------------------------
# Calendar
# ---------------------------------------------------------------------------


async def calculate_calendar_month(
    year: int,
    month: int,
    user_id: uuid.UUID,
    session: AsyncSession,
) -> list[dict]:
    """Build phase information for every day of a given month.

    Returns a list of dicts matching the CalendarDay schema.
    """
    # Fetch cycles and events
    cycles_result = await session.exec(
        select(Cycle)
        .where(Cycle.user_id == user_id)
        .order_by(Cycle.start_date),  # type: ignore[arg-type]
    )
    cycles = list(cycles_result.all())

    events_result = await session.exec(
        select(Event)
        .where(Event.user_id == user_id)
        .order_by(Event.event_date),  # type: ignore[arg-type]
    )
    events = list(events_result.all())

    # Build event lookup by date
    events_by_date: dict[date, list[str]] = {}
    for ev in events:
        events_by_date.setdefault(ev.event_date, []).append(ev.event_type)

    _, num_days = calendar.monthrange(year, month)
    first_day = date(year, month, 1)
    last_day = date(year, month, num_days)

    # Days that have a journal entry this month (for a discreet calendar marker)
    journal_result = await session.exec(
        select(JournalEntry.entry_date).where(
            JournalEntry.user_id == user_id,
            JournalEntry.entry_date >= first_day,
            JournalEntry.entry_date <= last_day,
        ),
    )
    journal_dates = set(journal_result.all())

    days: list[dict] = []

    for d in range(1, num_days + 1):
        current = date(year, month, d)
        day_in_cycle: int | None = None
        if cycles:
            info = calculate_phase(current, cycles, events)
            phase = info["phase"]
            confidence = info["confidence"]
            parent_phase = info["parent_phase"]
            day_in_cycle = info["day_in_cycle"]
        else:
            phase = None
            confidence = 0.0
            parent_phase = None

        days.append({
            "date": current,
            "phase": phase,
            "confidence": confidence,
            "events": events_by_date.get(current, []),
            "day_in_cycle": day_in_cycle,
            "parent_phase": parent_phase,
            "has_journal": current in journal_dates,
        })

    return days
