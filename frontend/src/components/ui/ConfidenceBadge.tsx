import { useTranslation } from 'react-i18next';

interface ConfidenceBadgeProps {
  confidence: number;
  systemState: string;
}

export default function ConfidenceBadge({ confidence, systemState }: ConfidenceBadgeProps) {
  const { t } = useTranslation();
  const label = t(`confidence.${systemState}`);
  const filled = Math.round(confidence * 4);
  const barColor = confidence >= 0.7
    ? 'bg-[#2DA87E]'
    : confidence >= 0.4
      ? 'bg-[#D4880F]'
      : 'bg-[#DC3D5A]';

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-warm-100 px-4 py-2.5 border border-warm-200/60">
      <div className="flex items-end gap-[3px]" aria-label={`${Math.round(confidence * 100)}%`}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`w-[5px] rounded-sm transition-all duration-300 ${
              i <= filled ? barColor : 'bg-warm-300/50'
            }`}
            style={{ height: `${6 + i * 4}px` }}
          />
        ))}
      </div>
      <span className="text-xs text-warm-500 leading-tight font-medium">{label}</span>
    </div>
  );
}
