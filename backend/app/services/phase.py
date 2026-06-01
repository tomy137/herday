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
    Phase.POST_MENSTRUAL: [
        "tips.post_menstrual.recovery",
        "tips.post_menstrual.calm",
        "tips.post_menstrual.routine",
        "tips.post_menstrual.support",
    ],
    Phase.PRE_OVULATORY: [
        "tips.pre_ovulatory.energy",
        "tips.pre_ovulatory.planning",
        "tips.pre_ovulatory.social",
        "tips.pre_ovulatory.new_activities",
    ],
    Phase.OVULATION: [
        "tips.ovulation.connection",
        "tips.ovulation.communication",
        "tips.ovulation.quality_time",
        "tips.ovulation.appreciation",
    ],
    Phase.POST_OVULATORY: [
        "tips.post_ovulatory.productive",
        "tips.post_ovulatory.focus",
        "tips.post_ovulatory.cocoon",
        "tips.post_ovulatory.nest",
    ],
    Phase.PRE_MENSTRUAL: [
        "tips.pre_menstrual.understanding",
        "tips.pre_menstrual.gentle",
        "tips.pre_menstrual.cravings",
        "tips.pre_menstrual.space",
    ],
}


def get_tips_for_phase(phase: Phase) -> list[str]:
    """Return translation keys for tips relevant to the given phase."""
    return _TIPS.get(phase, [])
