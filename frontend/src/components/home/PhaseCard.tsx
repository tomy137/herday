// SPDX-License-Identifier: AGPL-3.0-or-later
import { useTranslation } from 'react-i18next';
import type { PhaseInfo } from '../../api/client';
import type { Phase } from '../../lib/cycle-engine';
import { PHASE_SOFT_HEX, PHASE_HEX, PHASE_ICONS } from '../../constants/phases';
import { usePhaseContent } from '../../lib/use-phase-content';
import PhaseTag from '../ui/PhaseTag';
import ConfidenceBadge from '../ui/ConfidenceBadge';
import PostureRail from '../posture/PostureRail';
import PhaseProgress from './PhaseProgress';

interface PhaseCardProps {
  /** The phase to display (may differ from the current one on the calendar). */
  phase: Phase;
  /** Current-day info — its day-specific bits show only when phase is current. */
  info: PhaseInfo;
}

/**
 * The "light" phase card: emoji + name + range + posture, plus the day-specific
 * row (J{n}, confidence, progress) only when showing the *current* phase.
 * Stack a <PhaseDetail> after it to get the "complete" card.
 */
export default function PhaseCard({ phase, info }: PhaseCardProps) {
  const { t } = useTranslation('phases');
  const content = usePhaseContent(phase);
  const isCurrent = phase === (info.phase as Phase);
  const endsIn = info.phase_ends_in ?? 0;
  const daysLabel =
    endsIn > 0 ? t('labels.days_left', { count: endsIn }) : t('labels.switch_today');

  return (
    <div
      className="rounded-[14px] px-5 pb-[18px] pt-5"
      style={{ background: PHASE_SOFT_HEX[phase] }}
    >
      <div className="mb-3.5">
        <PhaseTag phase={phase} suffix={isCurrent ? `J${info.day_in_cycle}` : undefined} />
        <h2 className="mt-2 text-[22px] font-bold leading-tight tracking-tight text-ink">
          <span className="mr-1.5">{PHASE_ICONS[phase]}</span>{content.name}{' '}
          <span className="text-[18px] font-normal italic text-warm-500">
            — {content.range.toLowerCase()}
          </span>
        </h2>
        {isCurrent && (
          <div className="mt-3">
            <ConfidenceBadge confidence={info.confidence} systemState={info.system_state} />
          </div>
        )}
      </div>

      {isCurrent && (
        <div className="my-1.5 mb-3 flex items-center gap-2.5">
          <PhaseProgress phase={phase} phaseEndsIn={endsIn} />
          <span
            className="hd-meta whitespace-nowrap uppercase"
            style={{ color: PHASE_HEX[phase] }}
          >
            {daysLabel}
          </span>
        </div>
      )}

      <div className="my-3.5 h-[0.5px]" style={{ background: `${PHASE_HEX[phase]}30` }} />

      <div className="hd-caps mb-3 text-warm-500">{t('labels.she_needs_you_to_be')}</div>
      <PostureRail words={content.posture} />
    </div>
  );
}
