// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface OnbStepProps {
  index: number;
  total: number;
  eyebrow: string;
  title: string;
  children: ReactNode;
  cta: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  secondaryCta?: string;
  onSecondary?: () => void;
  onBack?: () => void;
}

/** Shared full-screen onboarding step scaffold. */
export default function OnbStep({
  index,
  total,
  eyebrow,
  title,
  children,
  cta,
  onPrimary,
  primaryDisabled,
  secondaryCta,
  onSecondary,
  onBack,
}: OnbStepProps) {
  const { t } = useTranslation('onboarding');
  return (
    <div className="flex min-h-screen flex-col bg-warm-50">
      <div className="flex items-center justify-between px-[22px] pt-3.5">
        {onBack ? (
          <button type="button" onClick={onBack} className="-ml-2 px-2 py-1.5 text-warm-500">
            ←
          </button>
        ) : (
          <span />
        )}
        <span className="hd-meta text-warm-400" style={{ letterSpacing: '0.08em' }}>
          {t('progress', {
            current: String(index + 1).padStart(2, '0'),
            total: String(total).padStart(2, '0'),
          })}
        </span>
      </div>

      <div className="flex flex-1 flex-col px-[26px] pb-6 pt-10">
        <div className="hd-caps mb-[18px] text-warm-400">{eyebrow}</div>
        <h1 className="mb-6 text-[28px] font-bold leading-tight tracking-tight text-ink" style={{ textWrap: 'pretty' }}>
          {title}
        </h1>
        <div className="flex-1">{children}</div>
      </div>

      <div className="flex flex-col gap-2 px-[22px] pb-7">
        {secondaryCta && (
          <button
            type="button"
            onClick={onSecondary}
            className="rounded-[10px] border-[0.5px] border-warm-300 bg-transparent px-5 py-3.5 text-[14px] font-medium text-ink transition-colors hover:bg-warm-100"
          >
            {secondaryCta}
          </button>
        )}
        <button
          type="button"
          onClick={onPrimary}
          disabled={primaryDisabled}
          className="rounded-[10px] bg-ink px-5 py-3.5 text-[14px] font-medium text-warm-50 transition-all hover:bg-ink-soft active:scale-[0.99] disabled:opacity-40"
        >
          {cta}
        </button>
      </div>
    </div>
  );
}
