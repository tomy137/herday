import { useTranslation } from 'react-i18next';
import type { Phase } from '../lib/cycle-engine';
import { PHASE_COLORS } from '../constants/phases';

interface Props {
  phase: Phase;
  animationDelay?: number;
}

export default function PhaseTipsCard({ phase, animationDelay }: Props) {
  const { t: tTips } = useTranslation('tips');
  return (
    <div
      className={`rounded-2xl p-5 ${PHASE_COLORS[phase].light} border ${PHASE_COLORS[phase].border} animate-fade-in-up`}
      style={animationDelay ? { animationDelay: `${animationDelay}ms` } : undefined}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-bold ${PHASE_COLORS[phase].text} uppercase tracking-wider`}>
          {tTips(`${phase}.season`)}
        </span>
        <span className="text-warm-300">—</span>
        <span className="text-xs font-semibold text-gray-700 italic">
          {tTips(`${phase}.role`)}
        </span>
      </div>

      <p className="text-sm text-gray-700 leading-relaxed mb-3">
        {tTips(`${phase}.bio`)}
      </p>

      <div className="space-y-2 mb-3">
        <div className="flex gap-2">
          <span className="text-sm shrink-0">👉</span>
          <p className="text-sm text-gray-700 leading-relaxed">{tTips(`${phase}.action`)}</p>
        </div>
        <div className="flex gap-2">
          <span className="text-sm shrink-0">💡</span>
          <p className="text-sm text-warm-500 leading-relaxed">{tTips(`${phase}.attitude`)}</p>
        </div>
      </div>

      <div className="flex gap-2 rounded-xl bg-[#DC3D5A]/6 px-3 py-2.5">
        <span className="text-sm shrink-0">⛔</span>
        <p className="text-xs text-[#DC3D5A]/80 leading-relaxed font-medium">
          {tTips(`${phase}.avoid`)}
        </p>
      </div>
    </div>
  );
}
