# SPDX-License-Identifier: AGPL-3.0-or-later
"""Unit tests for the calendar (.ics) feed service.

``compute_blocks`` / ``render_ics`` are pure (they take plain lists, not a DB
session), so these tests build Cycle objects directly.
"""

import uuid
from datetime import date, timedelta

from app.models.cycle import Cycle
from app.models.user import User
from app.services.calendar_ics import (
    CONFIDENT_DAYS,
    compute_blocks,
    render_ics,
)

USER_ID = uuid.uuid4()
TODAY = date(2026, 4, 15)


def _cycle(start: date, length: int | None = 28) -> Cycle:
    return Cycle(
        user_id=USER_ID,
        start_date=start,
        cycle_length=length,
        period_duration=5,
        source="confirmed",
        confidence=1.0,
    )


def _confident_cycles() -> list[Cycle]:
    """Four confirmed 28-day cycles → SystemState.CONFIDENT."""
    return [
        _cycle(date(2026, 1, 1)),
        _cycle(date(2026, 1, 29)),
        _cycle(date(2026, 2, 26)),
        _cycle(date(2026, 3, 26)),
    ]


def _user(locale: str = "fr", mode: str = "discreet") -> User:
    return User(email="t@example.com", locale=locale, calendar_labels_mode=mode)


# ---------------------------------------------------------------------------
# compute_blocks
# ---------------------------------------------------------------------------


def test_empty_when_unknown():
    """No cycles → no signal → empty feed (never bogus events)."""
    assert compute_blocks([], [], TODAY) == []


def test_produces_both_periods():
    blocks = compute_blocks(_confident_cycles(), [], TODAY)
    keys = {key for key, _, _ in blocks}
    assert keys == {"A", "B"}


def test_blocks_are_ordered_and_disjoint():
    blocks = compute_blocks(_confident_cycles(), [], TODAY)
    for (_, _, end), (_, nxt_start, _) in zip(blocks, blocks[1:]):
        assert end < nxt_start


def test_period_a_spans_cycle_boundary():
    """Period A merges pre_menstrual (end of cycle N) with menstruation (N+1),
    so its longest run is clearly longer than a menstruation-only block."""
    blocks = compute_blocks(_confident_cycles(), [], TODAY)
    longest_a = max(
        (end - start).days + 1 for key, start, end in blocks if key == "A"
    )
    # 6 PMS days + 5 menstruation days ≈ 11; well above the 5-day period alone.
    assert longest_a >= 8


def test_window_covers_past_and_future():
    blocks = compute_blocks(_confident_cycles(), [], TODAY)
    starts = [start for _, start, _ in blocks]
    assert min(starts) < TODAY  # ~1 cycle of history
    assert max(starts) > TODAY + timedelta(days=120)  # ~6 cycles ahead


# ---------------------------------------------------------------------------
# render_ics
# ---------------------------------------------------------------------------


def test_ics_structure_and_crlf():
    blocks = compute_blocks(_confident_cycles(), [], TODAY)
    ics = render_ics(_user(), blocks, "https://herday.test", TODAY)

    assert ics.startswith("BEGIN:VCALENDAR\r\n")
    assert ics.rstrip("\r\n").endswith("END:VCALENDAR")
    assert "\n" in ics and ics.count("\r\n") == ics.count("\n")  # every LF paired with CR
    assert "BEGIN:VEVENT" in ics
    assert "DTSTART;VALUE=DATE:" in ics
    assert "DTEND;VALUE=DATE:" in ics


def test_google_subscription_compatible_properties():
    """Aligned on a Google-compatible feed: PUBLIC visibility (so a non-owner
    subscriber sees the events), plus METHOD/STATUS/SEQUENCE/LAST-MODIFIED."""
    blocks = compute_blocks(_confident_cycles(), [], TODAY)
    ics = render_ics(_user(), blocks, "https://herday.test", TODAY)
    assert "CLASS:PUBLIC" in ics
    assert "CLASS:PRIVATE" not in ics  # PRIVATE hid all events in Google subscriptions
    assert "METHOD:PUBLISH" in ics
    assert "STATUS:CONFIRMED" in ics
    assert "SEQUENCE:0" in ics
    assert "LAST-MODIFIED:" in ics


def test_dtstamp_is_stable_within_a_day():
    """DTSTAMP is anchored to the day (not request time) so the body is byte-stable
    across same-day fetches — a stable ETag for Google's ingestion."""
    blocks = compute_blocks(_confident_cycles(), [], TODAY)
    a = render_ics(_user(), blocks, "https://herday.test", TODAY)
    b = render_ics(_user(), blocks, "https://herday.test", TODAY)
    assert a == b
    assert f"DTSTAMP:{TODAY.strftime('%Y%m%d')}T000000Z" in a


def test_discreet_labels_hide_content():
    blocks = compute_blocks(_confident_cycles(), [], TODAY)
    ics = render_ics(_user(mode="discreet"), blocks, "https://herday.test", TODAY)
    assert "Période A" in ics
    assert "Période B" in ics
    assert "SPM" not in ics  # nothing explicit leaks
    assert "BEGIN:VALARM" not in ics  # no alarm would betray a discreet event


def test_explicit_labels_and_alarm():
    blocks = compute_blocks(_confident_cycles(), [], TODAY)
    ics = render_ics(_user(mode="explicit"), blocks, "https://herday.test", TODAY)
    assert "SPM & Règles" in ics
    assert "Fenêtre fertile" in ics
    assert "BEGIN:VALARM" in ics
    assert "TRIGGER:-P1D" in ics


def test_far_future_blocks_are_tentative():
    blocks = compute_blocks(_confident_cycles(), [], TODAY)
    ics = render_ics(_user(mode="discreet"), blocks, "https://herday.test", TODAY)
    # At least one block starts beyond the confident window and must be marked.
    assert any((start - TODAY).days > CONFIDENT_DAYS for _, start, _ in blocks)
    assert "≈" in ics


def test_uid_is_stable_and_anchored_on_start():
    blocks = compute_blocks(_confident_cycles(), [], TODAY)
    ics = render_ics(_user(), blocks, "https://herday.test", TODAY)
    key, start, _ = blocks[0]
    expected = f"UID:herday-{key}-{start.strftime('%Y%m%d')}@herday.test"
    assert expected in ics
