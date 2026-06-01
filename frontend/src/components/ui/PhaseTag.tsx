// SPDX-License-Identifier: AGPL-3.0-or-later
import { useTranslation } from 'react-i18next';
import type { Phase } from '../../lib/cycle-engine';
import { PHASE_HEX } from '../../constants/phases';

interface PhaseTagProps {
  phase: Phase;
  /** Optional trailing suffix, e.g. "J24". */
  suffix?: string;
}

/**
 * Small meta tag: a phase-coloured dot + the phase short name (+ optional
 * suffix). Editorial caps/meta styling.
 */
export default function PhaseTag({ phase, suffix }: PhaseTagProps) {
  const { t } = useTranslation('phases');
  return (
    <span className="inline-flex items-center gap-1.5 text-warm-500 hd-meta uppercase">
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: PHASE_HEX[phase] }}
      />
      <span>
        {t(`${phase}.short`)}
        {suffix ? ` · ${suffix}` : ''}
      </span>
    </span>
  );
}
