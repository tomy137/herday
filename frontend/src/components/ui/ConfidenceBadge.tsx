// SPDX-License-Identifier: AGPL-3.0-or-later
import { useTranslation } from 'react-i18next';

interface ConfidenceBadgeProps {
  confidence: number;
  systemState: string;
  /** Inline editorial variant (no boxed background). Default true. */
  inline?: boolean;
}

/**
 * Confidence indicator: a caps label ("Confiance · élevée") + four pips.
 * Editorial inline styling by default; pass inline={false} for the boxed look.
 */
export default function ConfidenceBadge({ confidence, systemState, inline = true }: ConfidenceBadgeProps) {
  const { t } = useTranslation();
  const label = t(`confidence.${systemState}`);
  const filled = Math.max(0, Math.min(4, Math.round(confidence * 4)));

  const pips = (
    <span className="inline-flex items-end gap-[2px]" aria-label={`${Math.round(confidence * 100)}%`}>
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`inline-block w-1 rounded-[1px] transition-all duration-300 ${
            i <= filled ? 'bg-ink' : 'bg-warm-300'
          }`}
          style={{ height: '8px' }}
        />
      ))}
    </span>
  );

  if (inline) {
    return (
      <span className="inline-flex items-center gap-1.5 hd-caps text-warm-500">
        <span className="normal-case tracking-[0.04em]">{label}</span>
        {pips}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-warm-100 px-4 py-2.5 border border-warm-200/60">
      {pips}
      <span className="text-xs text-warm-500 leading-tight font-medium">{label}</span>
    </div>
  );
}
