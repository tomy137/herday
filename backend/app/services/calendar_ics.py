# SPDX-License-Identifier: AGPL-3.0-or-later
"""iCalendar (.ics) feed generation for the two key cycle periods.

Powers the partner's living calendar subscription. Two aggregated blocks are
projected from the cycle engine and serialised as all-day VEVENTs:

- **Period A** — pre-menstrual (PMS) + menstruation. Mood down, cramps, needs support.
- **Period B** — pre-ovulatory + ovulation (the fertile window). Energy and mood high.

The output is deliberately minimal (all-day dates only, no VTIMEZONE, no RRULE),
so we hand-roll the serialiser rather than pull an ical dependency in on top of
health data. The window spans ~1 cycle back (so the current block shows in full)
to ~6 cycles forward; dates beyond ~3 months are flagged as tentative because the
modular projection drifts the further out it runs.
"""

from datetime import date, timedelta

from app.models.cycle import Cycle
from app.models.event import Event
from app.models.user import User
from app.services.cycle_engine import (
    Phase,
    SystemState,
    calculate_phase,
    get_system_state,
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# The two aggregated periods, each a set of engine sub-phases. They are
# calendar-contiguous: pre_menstrual (end of cycle N) flows straight into
# menstruation (start of N+1), so Period A is a single run across the boundary.
GROUP_A = {Phase.PRE_MENSTRUAL.value, Phase.MENSTRUATION.value}   # PMS + period
GROUP_B = {Phase.PRE_OVULATORY.value, Phase.OVULATION.value}      # fertile window

PAST_DAYS = 35      # ~1 cycle back: keeps the currently-active block whole
HORIZON_DAYS = 190  # ~6 cycles forward
CONFIDENT_DAYS = 90  # beyond ~3 cycles the projection is flagged as tentative

LABELS_MODES = {"explicit", "discreet"}
DEFAULT_LOCALE = "fr"

# labels[locale][group_key][mode] -> (summary, description)
# Discreet mode uses a neutral glyph and an empty description so nothing
# sensitive surfaces in a calendar that may be synced with a work account.
LABELS: dict[str, dict[str, dict[str, tuple[str, str]]]] = {
    "fr": {
        "A": {
            "explicit": (
                "SPM & Règles",
                "Moral possiblement en baisse, douleurs possibles — besoin de douceur et de soutien.",
            ),
            "discreet": ("🌙 Période A", ""),
        },
        "B": {
            "explicit": ("Fenêtre fertile", "Énergie et moral au plus haut."),
            "discreet": ("☀️ Période B", ""),
        },
    },
    "en": {
        "A": {
            "explicit": (
                "PMS & Period",
                "Mood possibly low, cramps likely — she needs gentleness and support.",
            ),
            "discreet": ("🌙 Period A", ""),
        },
        "B": {
            "explicit": ("Fertile window", "Energy and mood at their peak."),
            "discreet": ("☀️ Period B", ""),
        },
    },
    "de": {
        "A": {
            "explicit": (
                "PMS & Periode",
                "Stimmung evtl. gedrückt, Schmerzen möglich — sie braucht Sanftheit und Unterstützung.",
            ),
            "discreet": ("🌙 Phase A", ""),
        },
        "B": {
            "explicit": ("Fruchtbares Fenster", "Energie und Stimmung auf dem Höhepunkt."),
            "discreet": ("☀️ Phase B", ""),
        },
    },
}

# (prefix, explicit-suffix, note) applied to far-future, tentative blocks.
TENTATIVE: dict[str, tuple[str, str, str]] = {
    "fr": ("≈ ", " (prévision)", "Prévision approximative — s'affine à chaque cycle."),
    "en": ("≈ ", " (forecast)", "Rough forecast — refines with each cycle."),
    "de": ("≈ ", " (Prognose)", "Ungefähre Prognose — wird mit jedem Zyklus genauer."),
}


# ---------------------------------------------------------------------------
# Block computation
# ---------------------------------------------------------------------------


def compute_blocks(
    cycles: list[Cycle],
    events: list[Event],
    today: date,
) -> list[tuple[str, date, date]]:
    """Return contiguous ``(group_key, start, end_inclusive)`` runs over the window.

    Iterates the cycle engine day by day from ``today - PAST_DAYS`` to
    ``today + HORIZON_DAYS`` and coalesces consecutive days belonging to the
    same target group. Returns an empty list when the system has no signal yet
    (``SystemState.UNKNOWN``), so an un-primed account yields an empty feed
    rather than bogus events.
    """
    if get_system_state(cycles) == SystemState.UNKNOWN:
        return []

    start = today - timedelta(days=PAST_DAYS)
    end = today + timedelta(days=HORIZON_DAYS)

    blocks: list[tuple[str, date, date]] = []
    run_key: str | None = None
    run_start: date | None = None
    prev: date | None = None

    d = start
    while d <= end:
        phase = calculate_phase(d, cycles, events)["phase"]
        key = "A" if phase in GROUP_A else "B" if phase in GROUP_B else None
        if key != run_key:
            if run_key is not None and run_start is not None and prev is not None:
                blocks.append((run_key, run_start, prev))
            run_key = key
            run_start = d
        prev = d
        d += timedelta(days=1)

    if run_key is not None and run_start is not None and prev is not None:
        blocks.append((run_key, run_start, prev))

    return blocks


# ---------------------------------------------------------------------------
# Serialisation
# ---------------------------------------------------------------------------


def _resolve_locale(locale: str | None) -> str:
    return locale if locale in LABELS else DEFAULT_LOCALE


def _resolve_mode(mode: str | None) -> str:
    return mode if mode in LABELS_MODES else "discreet"


def _labels_for(
    locale: str,
    group_key: str,
    mode: str,
    tentative: bool,
) -> tuple[str, str]:
    summary, description = LABELS[locale][group_key][mode]
    if tentative:
        prefix, suffix, note = TENTATIVE[locale]
        if mode == "explicit":
            summary = f"{prefix}{summary}{suffix}"
            description = f"{note} {description}".strip()
        else:
            # Keep the description empty in discreet mode; the ≈ prefix is enough.
            summary = f"{prefix}{summary}"
    return summary, description


def _fmt_date(d: date) -> str:
    return d.strftime("%Y%m%d")


def _escape(text: str) -> str:
    """Escape TEXT values per RFC 5545 (backslash first)."""
    return (
        text.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
    )


def _fold(line: str) -> str:
    """Fold a content line to <=75 octets per RFC 5545 (continuation = CRLF+space).

    Splits on UTF-8 octet boundaries without breaking multi-byte characters.
    """
    encoded = line.encode("utf-8")
    if len(encoded) <= 75:
        return line

    chunks: list[bytes] = []
    pos = 0
    limit = 75  # continuation lines carry a leading space, so they allow 74
    while pos < len(encoded):
        end = min(pos + limit, len(encoded))
        # Back off so we never cut in the middle of a multi-byte character.
        while end < len(encoded) and (encoded[end] & 0xC0) == 0x80:
            end -= 1
        chunks.append(encoded[pos:end])
        pos = end
        limit = 74
    return "\r\n ".join(chunk.decode("utf-8") for chunk in chunks)


def _uid_host(host: str) -> str:
    """Reduce a base URL to a bare domain for use in a UID."""
    domain = host.split("://")[-1].split("/")[0].split(":")[0]
    return domain or "herday"


def render_ics(
    user: User,
    blocks: list[tuple[str, date, date]],
    host: str,
    today: date,
) -> str:
    """Serialise blocks into a VCALENDAR string (CRLF line endings, folded)."""
    locale = _resolve_locale(user.locale)
    mode = _resolve_mode(user.calendar_labels_mode)
    # Stable per-day timestamp: the feed changes at most once a day (the projection
    # window rolls forward), so anchoring DTSTAMP/LAST-MODIFIED to the start of the
    # current UTC day keeps the body byte-identical across same-day fetches — a
    # stable version signature Google's subscription ingestion can rely on.
    stamp = today.strftime("%Y%m%dT000000Z")
    uid_host = _uid_host(host)

    lines: list[str] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        f"PRODID:-//HerDay//Calendar Feed//{locale.upper()}",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:HerDay",
        "X-PUBLISHED-TTL:PT12H",
        "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
    ]

    for group_key, start, end in blocks:
        tentative = (start - today).days > CONFIDENT_DAYS
        summary, description = _labels_for(locale, group_key, mode, tentative)
        lines.append("BEGIN:VEVENT")
        lines.append(f"UID:herday-{group_key}-{_fmt_date(start)}@{uid_host}")
        lines.append(f"DTSTAMP:{stamp}")
        lines.append(f"LAST-MODIFIED:{stamp}")
        lines.append("SEQUENCE:0")
        lines.append("STATUS:CONFIRMED")
        lines.append(f"DTSTART;VALUE=DATE:{_fmt_date(start)}")
        # DTEND is exclusive for all-day events → day after the last day.
        lines.append(f"DTEND;VALUE=DATE:{_fmt_date(end + timedelta(days=1))}")
        lines.append(f"SUMMARY:{_escape(summary)}")
        if description:
            lines.append(f"DESCRIPTION:{_escape(description)}")
        lines.append("TRANSP:TRANSPARENT")
        # CLASS:PUBLIC is required for a *subscription*: on a calendar the viewer
        # doesn't own, Google shows PRIVATE events only to their attendees — ours
        # have none, so PRIVATE hid all 17 events (import and Apple were unaffected).
        lines.append("CLASS:PUBLIC")
        # Reminder the day before — only in explicit mode (an alarm would betray
        # a discreet event) and only within the confident window (an alarm on a
        # fuzzy far-future date would misfire).
        if mode == "explicit" and not tentative:
            lines.append("BEGIN:VALARM")
            lines.append("ACTION:DISPLAY")
            lines.append(f"DESCRIPTION:{_escape(summary)}")
            lines.append("TRIGGER:-P1D")
            lines.append("END:VALARM")
        lines.append("END:VEVENT")

    lines.append("END:VCALENDAR")
    return "\r\n".join(_fold(line) for line in lines) + "\r\n"
