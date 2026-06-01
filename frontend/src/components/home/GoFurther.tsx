// SPDX-License-Identifier: AGPL-3.0-or-later
import { useTranslation } from 'react-i18next';
import type { Phase } from '../../lib/cycle-engine';
import { usePhaseContent } from '../../lib/use-phase-content';
import Accordion from '../ui/Accordion';

interface GoFurtherProps {
  phase: Phase;
}

/** Three accordions: what to observe / offer / avoid for the current phase. */
export default function GoFurther({ phase }: GoFurtherProps) {
  const { t } = useTranslation('phases');
  const content = usePhaseContent(phase);

  return (
    <div className="rounded-[14px] bg-warm-100 px-[18px] pb-2 pt-1">
      <Accordion title={t('labels.observe')}>
        <ul className="hd-list-tight">
          {content.observable.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </Accordion>
      <Accordion title={t('labels.propose')}>
        <ul className="hd-list-tight">
          {content.propose.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </Accordion>
      <Accordion title={t('labels.avoid')}>
        <ul className="hd-list-tight">
          {content.avoid.map((x, i) => (
            <li key={i} data-tone="avoid">
              {x}
            </li>
          ))}
        </ul>
      </Accordion>
    </div>
  );
}
