// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Phase } from '../../lib/cycle-engine';
import { PHASE_HEX } from '../../constants/phases';
import { PHASE_RANGES_28 } from '../../constants/phase-meta';

interface PhaseProgressProps {
  phase: Phase;
  /** Days remaining in the current sub-phase, inclusive of today. */
  phaseEndsIn: number;
}

/**
 * A tiny strip of segments showing the position within the current sub-phase.
 * Span is taken from the reference 28-day bands (editorial approximation).
 */
export default function PhaseProgress({ phase, phaseEndsIn }: PhaseProgressProps) {
  const band = PHASE_RANGES_28[phase];
  const span = Math.max(1, band.to - band.from + 1);
  // Filled segments include today: span - remaining + 1, clamped to [1, span].
  const filled = Math.min(span, Math.max(1, span - phaseEndsIn + 1));
  const color = PHASE_HEX[phase];

  return (
    <span className="inline-flex flex-none gap-[3px]">
      {Array.from({ length: span }).map((_, i) => (
        <span
          key={i}
          className="h-1 w-3.5 rounded-[1px]"
          style={{ background: i < filled ? color : `${color}38` }}
        />
      ))}
    </span>
  );
}
