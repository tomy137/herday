// SPDX-License-Identifier: AGPL-3.0-or-later
import { useTranslation } from 'react-i18next';
import type { Phase } from '../../lib/cycle-engine';
import { usePhaseContent } from '../../lib/use-phase-content';

interface PhaseDetailProps {
  phase: Phase;
}

function DetailList({ items, avoid }: { items: string[]; avoid?: boolean }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((x, i) => (
        <li key={i} className="relative pl-4 text-[14.5px] leading-[1.62] text-ink-soft">
          <span
            className="absolute left-0 top-[0.72em] h-[0.5px] w-2"
            style={{ background: avoid ? 'var(--color-phase-menstruation)' : 'var(--color-warm-400)' }}
          />
          {x}
        </li>
      ))}
    </ul>
  );
}

/**
 * Expanded, flat phase detail (repères biologiques / conseillé / déconseillé),
 * laid out for comfortable reading — no accordions. Used on the calendar.
 */
export default function PhaseDetail({ phase }: PhaseDetailProps) {
  const { t } = useTranslation('phases');
  const content = usePhaseContent(phase);
  return (
    <div className="rounded-[14px] bg-warm-100 px-5 py-5">
      <section>
        <h3 className="mb-2.5 text-[15px] font-semibold text-ink">{t('labels.bio')}</h3>
        <p className="text-[14.5px] leading-[1.65] text-ink-soft">{content.bio}</p>
      </section>

      <div className="hd-rule-soft my-5" />

      <section>
        <h3 className="mb-3 text-[15px] font-semibold text-ink">{t('labels.advised')}</h3>
        <DetailList items={content.advised} />
      </section>

      <div className="hd-rule-soft my-5" />

      <section>
        <h3 className="mb-3 text-[15px] font-semibold text-ink">{t('labels.discouraged')}</h3>
        <DetailList items={content.discouraged} avoid />
      </section>
    </div>
  );
}
