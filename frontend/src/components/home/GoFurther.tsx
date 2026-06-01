// SPDX-License-Identifier: AGPL-3.0-or-later
import { useTranslation } from 'react-i18next';
import type { Phase } from '../../lib/cycle-engine';
import { usePhaseContent } from '../../lib/use-phase-content';
import Accordion from '../ui/Accordion';

interface GoFurtherProps {
  phase: Phase;
}

/** Three accordions: biological reference / advised / discouraged. */
export default function GoFurther({ phase }: GoFurtherProps) {
  const { t } = useTranslation('phases');
  const content = usePhaseContent(phase);

  return (
    <div className="rounded-[14px] bg-warm-100 px-[18px] pb-2 pt-1">
      <Accordion title={t('labels.bio')}>
        <p className="text-[13.5px] leading-relaxed text-ink-soft">{content.bio}</p>
      </Accordion>
      <Accordion title={t('labels.advised')}>
        <ul className="hd-list-tight">
          {content.advised.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </Accordion>
      <Accordion title={t('labels.discouraged')}>
        <ul className="hd-list-tight">
          {content.discouraged.map((x, i) => (
            <li key={i} data-tone="avoid">
              {x}
            </li>
          ))}
        </ul>
      </Accordion>
    </div>
  );
}
