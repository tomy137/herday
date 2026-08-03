# SPDX-License-Identifier: AGPL-3.0-or-later
"""Échos — cross-cycle memory aggregation.

Aggregates the user's daily journal entries by *sub-phase* across previous
cycles, so the home/échos screens can recall "how you saw her, at this phase,
last cycles". Reuses ``calculate_phase`` to map each dated entry to its
sub-phase, keeping it consistent with /phases/today and the calendar.
"""

import json
import uuid
from collections import Counter
from collections.abc import Sequence
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
)

_HISTORY_LIMIT = 6  # at most ~6 previous occurrences


def _text(value: str | None) -> str | None:
    """Trimmed text, or ``None`` when blank (legacy rows may hold whitespace)."""
    return value.strip() or None if value else None


def _is_blank(entry: JournalEntry) -> bool:
    """True when an entry carries nothing to echo back (legacy empty rows)."""
    try:
        pastilles = json.loads(entry.pastilles_json or "[]")
    except (ValueError, TypeError):
        pastilles = []
    return not (
        pastilles
        or _text(entry.free_text)
        or _text(entry.helpful)
        or _text(entry.not_helpful)
    )


def sub_phases_of(parent: str) -> list[str]:
    """The sub-phase ids grouped under a parent phase (legacy routes)."""
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
    phases: Sequence[str] | None = None,
) -> EchoResponse:
    """Aggregate cross-cycle memory for the sub-phase of ``target_date``
    (or for the explicit ``phases`` selected on the échos screen).

    ``phases`` normally holds a single sub-phase — the échos screen shows one
    per selector chip, so two chips never share the same content. It accepts
    several so the legacy parent-phase routes keep working.
    """
    cycles_result = await session.exec(
        select(Cycle).where(Cycle.user_id == user_id).order_by(Cycle.start_date),  # type: ignore[arg-type]
    )
    cycles = list(cycles_result.all())

    events_result = await session.exec(
        select(Event).where(Event.user_id == user_id).order_by(Event.event_date),  # type: ignore[arg-type]
    )
    events = list(events_result.all())

    # Default to today's own sub-phase.
    if not phases:
        phases = [calculate_phase(target_date, cycles, events)["phase"]]

    sub_phases = [Phase(p) for p in phases]
    wanted = set(sub_phases)
    parent = PARENT_OF_SUBPHASE[sub_phases[0]]

    journal_result = await session.exec(
        select(JournalEntry)
        .where(JournalEntry.user_id == user_id)
        .order_by(JournalEntry.entry_date),  # type: ignore[arg-type]
    )
    entries = list(journal_result.all())

    # Keep entries landing on one of the wanted sub-phases. The current cycle's
    # earlier same-phase entries are included; only today's own entry is
    # excluded — no point echoing the entry you're currently writing back at you.
    by_cycle: dict[date, list[tuple[int, JournalEntry]]] = {}
    matching: list[JournalEntry] = []
    for entry in entries:
        if entry.entry_date == target_date:
            continue
        if _is_blank(entry):
            continue
        covering = _covering_cycle(cycles, entry.entry_date)
        if covering is None:
            continue
        info = calculate_phase(entry.entry_date, cycles, events)
        if Phase(info["phase"]) not in wanted:
            continue
        day_in_cycle = (entry.entry_date - covering.start_date).days + 1
        by_cycle.setdefault(covering.start_date, []).append((day_in_cycle, entry))
        matching.append(entry)

    # Build history (most recent cycle first, bounded). Occurrences without a
    # note are skipped: they would render as a dated line with nothing under it.
    history: list[EchoOccurrence] = []
    for cycle_start in sorted(by_cycle.keys(), reverse=True):
        if len(history) == _HISTORY_LIMIT:
            break
        rows = by_cycle[cycle_start]
        # representative note: the longest non-empty free_text of the occurrence
        notes = [n for _, e in rows if (n := _text(e.free_text))]
        if not notes:
            continue
        days = [d for d, _ in rows]
        history.append(
            EchoOccurrence(
                cycle_start=cycle_start,
                day_from=min(days),
                day_to=max(days),
                note=max(notes, key=len),
            )
        )

    # Helpful / not-helpful, most recent first.
    helpful = [n for e in reversed(matching) if (n := _text(e.helpful))]
    not_helpful = [n for e in reversed(matching) if (n := _text(e.not_helpful))]

    # Frequent pastilles.
    counter: Counter[str] = Counter()
    for e in matching:
        try:
            for pid in json.loads(e.pastilles_json or "[]"):
                counter[pid] += 1
        except (ValueError, TypeError):
            continue
    total = len(matching)
    frequent = [
        FrequencyItem(pastille=pid, count=count, total=total)
        for pid, count in counter.most_common()
    ]

    return EchoResponse(
        parent_phase=parent,
        sub_phases=[p.value for p in sub_phases],
        history=history,
        helpful=helpful,
        not_helpful=not_helpful,
        frequent=frequent,
    )
