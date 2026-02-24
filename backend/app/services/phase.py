# SPDX-License-Identifier: AGPL-3.0-or-later
"""Phase tips service.

Returns translation keys for frontend display rather than hardcoded text.
The frontend is responsible for resolving these keys to the user's locale.
"""

from app.services.cycle_engine import Phase

# Translation keys grouped by phase
_TIPS: dict[Phase, list[str]] = {
    Phase.MENSTRUATION: [
        "tips.menstruation.comfort",
        "tips.menstruation.warmth",
        "tips.menstruation.patience",
        "tips.menstruation.rest",
    ],
    Phase.FOLLICULAR: [
        "tips.follicular.energy",
        "tips.follicular.planning",
        "tips.follicular.social",
        "tips.follicular.new_activities",
    ],
    Phase.OVULATION: [
        "tips.ovulation.connection",
        "tips.ovulation.communication",
        "tips.ovulation.quality_time",
        "tips.ovulation.appreciation",
    ],
    Phase.LUTEAL: [
        "tips.luteal.understanding",
        "tips.luteal.gentle",
        "tips.luteal.cravings",
        "tips.luteal.space",
    ],
}


def get_tips_for_phase(phase: Phase) -> list[str]:
    """Return translation keys for tips relevant to the given phase."""
    return _TIPS.get(phase, [])
