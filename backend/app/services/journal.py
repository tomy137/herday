# SPDX-License-Identifier: AGPL-3.0-or-later
"""Journal domain constants.

The pastille catalogue is the fixed set of quick-tap "moments" a user can
attach to a daily entry. Labels live in the frontend i18n (journal.pastilles.*);
the backend only validates ids and counts frequencies.
Keep in sync with frontend/src/constants/phase-meta.ts (PASTILLE_IDS).
"""

PASTILLE_IDS: tuple[str, ...] = (
    "dispute",
    "fatigue",
    "repli",
    "coquin",
    "tendresse",
    "rires",
    "douleur",
    "larmes",
    "bon-moment",
    "energie",
    "pulsion",
    "conversation",
)
