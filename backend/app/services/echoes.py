# SPDX-License-Identifier: AGPL-3.0-or-later
"""Échos — cross-cycle memory aggregation.

Aggregates the user's daily journal entries by *parent phase* across previous
cycles, so the home/échos screens can recall "how you saw her, at this phase,
last cycles". Reuses ``calculate_phase`` to map each dated entry to a sub-phase
(then to its parent), keeping it consistent with /phases/today and the calendar.
"""

import json
import uuid
from collections import Counter
from datetime import date

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.cycle import Cycle
from app.models.event import Event
from app.models.journal import JournalEntry
from app.schemas.echo import EchoOccurrence, EchoResponse, FrequencyItem
from app.services.cycle_engine import (
    PARENT_OF_SUBPHASE,
    Phase,
    calculate_phase,
    load_overrides,
)

_HISTORY_LIMIT = 6  # at most ~6 previous occurrences


def _sub_phases_of(parent: str) -> list[str]:
    return [p.value for p, par in PARENT_OF_SUBPHASE.items() if par == parent]


def _covering_cycle(cycles_sorted: list[Cycle], d: date) -> Cycle | None:
    """Most recent cycle whose start_date <= d (cycles sorted by start_date)."""
    covering: Cycle | None = None
    for c in cycles_sorted:
        if c.start_date <= d:
            covering = c
        else:
            break
    return covering


async def aggregate_echoes(
    user_id: uuid.UUID,
    target_date: date,
    session: AsyncSession,
    parent: str | None = None,
) -> EchoResponse:
    """Aggregate cross-cycle memory for the parent phase of ``target_date``
    (or for an explicit ``parent`` when navigating the échos screen).
    """
    cycles_result = await session.exec(
        select(Cycle).where(Cycle.user_id == user_id).order_by(Cycle.start_date),  # type: ignore[arg-type]
    )
    cycles = list(cycles_result.all())

    events_result = await session.exec(
        select(Event).where(Event.user_id == user_id).order_by(Event.event_date),  # type: ignore[arg-type]
    )
    events = list(events_result.all())

    overrides = await load_overrides(user_id, session)

    # Current parent phase
    if parent is None:
        today_info = calculate_phase(target_date, cycles, events, overrides)
        parent = today_info["parent_phase"]

    sub_phases = _sub_phases_of(parent)
    current_cycle = _covering_cycle(cycles, target_date)
    current_start = current_cycle.start_date if current_cycle else None

    journal_result = await session.exec(
        select(JournalEntry)
        .where(JournalEntry.user_id == user_id)
        .order_by(JournalEntry.entry_date),  # type: ignore[arg-type]
    )
    entries = list(journal_result.all())

    # Keep entries whose parent phase matches, excluding the current cycle.
    by_cycle: dict[date, list[tuple[int, JournalEntry]]] = {}
    matching_past: list[JournalEntry] = []
    for entry in entries:
        covering = _covering_cycle(cycles, entry.entry_date)
        if covering is None:
            continue
        if current_start is not None and covering.start_date == current_start:
            continue  # exclude the current cycle from the memory
        info = calculate_phase(entry.entry_date, cycles, events, overrides)
        if PARENT_OF_SUBPHASE[Phase(info["phase"])] != parent:
            continue
        day_in_cycle = (entry.entry_date - covering.start_date).days + 1
        by_cycle.setdefault(covering.start_date, []).append((day_in_cycle, entry))
        matching_past.append(entry)

    # Build history (most recent cycle first, bounded).
    history: list[EchoOccurrence] = []
    for cycle_start in sorted(by_cycle.keys(), reverse=True)[:_HISTORY_LIMIT]:
        rows = by_cycle[cycle_start]
        days = [d for d, _ in rows]
        # representative note: the longest non-empty free_text of the occurrence
        notes = [e.free_text for _, e in rows if e.free_text]
        note = max(notes, key=len) if notes else None
        history.append(
            EchoOccurrence(
                cycle_start=cycle_start,
                day_from=min(days),
                day_to=max(days),
                note=note,
            )
        )

    # Helpful / not-helpful, most recent first.
    helpful = [e.helpful for e in reversed(matching_past) if e.helpful]
    not_helpful = [e.not_helpful for e in reversed(matching_past) if e.not_helpful]

    # Frequent pastilles.
    counter: Counter[str] = Counter()
    for e in matching_past:
        try:
            for pid in json.loads(e.pastilles_json or "[]"):
                counter[pid] += 1
        except (ValueError, TypeError):
            continue
    total = len(matching_past)
    frequent = [
        FrequencyItem(pastille=pid, count=count, total=total)
        for pid, count in counter.most_common()
    ]

    return EchoResponse(
        parent_phase=parent,
        sub_phases=sub_phases,
        history=history,
        helpful=helpful,
        not_helpful=not_helpful,
        frequent=frequent,
    )
