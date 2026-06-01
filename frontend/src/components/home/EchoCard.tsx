// SPDX-License-Identifier: AGPL-3.0-or-later
import { useTranslation } from 'react-i18next';
import type { EchoAggregate } from '../../api/client';
import EchoRow from './EchoRow';

interface EchoCardProps {
  echo: EchoAggregate;
  onSeeAll: () => void;
}

/** Home "Echo · previous cycle" recall card. Hidden by the parent when empty. */
export default function EchoCard({ echo, onSeeAll }: EchoCardProps) {
  const { t } = useTranslation('echoes');
  const helpful = echo.helpful[0];
  const notHelpful = echo.not_helpful[0];
  if (!helpful && !notHelpful) return null;

  return (
    <div className="hd-card">
      <div className="mb-3 flex items-center justify-between">
        <span className="hd-caps text-warm-500">{t('card.eyebrow')}</span>
        <span className="hd-meta text-warm-400">—28 J</span>
      </div>

      <h3 className="mb-3.5 text-[16px] font-normal leading-snug text-ink" style={{ textWrap: 'pretty' }}>
        {t('card.title')}
      </h3>

      <div className="flex flex-col gap-2.5">
        {helpful && <EchoRow tone="helpful" label={t('helped')} item={helpful} />}
        {notHelpful && <EchoRow tone="avoid" label={t('not_helped')} item={notHelpful} />}
      </div>

      <button
        type="button"
        onClick={onSeeAll}
        className="mt-2.5 text-[12px] text-warm-500 transition-colors hover:text-ink"
      >
        {t('card.see_all')} →
      </button>
    </div>
  );
}
