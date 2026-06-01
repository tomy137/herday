// SPDX-License-Identifier: AGPL-3.0-or-later
import { useTranslation } from 'react-i18next';
import type { PhaseInfo } from '../../api/client';
import { PHASE_HEX } from '../../constants/phases';
import { PHASE_ORDER } from '../../constants/phase-meta';

interface OverrideSheetContentProps {
  info: PhaseInfo;
  onPick: (phase: string) => void;
}

/** Body of the "I see her differently" sheet: pick one of the six sub-phases. */
export default function OverrideSheetContent({ info, onPick }: OverrideSheetContentProps) {
  const { t } = useTranslation('journal');
  const { t: tp } = useTranslation('phases');
  const predicted = info.estimated_phase ?? info.phase;

  return (
    <div>
      <h3 className="mb-1.5 text-[20px] font-normal leading-snug text-ink">
        {t('override.title')}
      </h3>
      <p className="mb-[18px] text-[13px] leading-relaxed text-warm-500">{t('override.note')}</p>

      <div className="flex flex-col gap-1.5">
        {PHASE_ORDER.map((id) => {
          const selected = id === info.phase;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onPick(id)}
              className={`flex items-center gap-3 rounded-[10px] border-[0.5px] px-3.5 py-3 text-left transition-colors ${
                selected ? 'border-ink bg-warm-100' : 'border-warm-300 bg-transparent hover:bg-warm-100'
              }`}
            >
              <span
                className="h-3 w-3 flex-none rounded-[2px]"
                style={{ background: PHASE_HEX[id] }}
              />
              <div className="flex-1">
                <div className="text-[14px] text-ink">{tp(`${id}.name`)}</div>
                <div className="hd-meta mt-0.5 text-warm-400">{tp(`${id}.range`)}</div>
              </div>
              {id === predicted && (
                <span className="hd-meta uppercase text-warm-500">{t('override.predicted')}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
