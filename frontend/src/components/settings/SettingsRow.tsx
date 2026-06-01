// SPDX-License-Identifier: AGPL-3.0-or-later
interface SettingsRowProps {
  label: string;
  value?: string;
  hint?: string;
  tone?: 'warn';
  onClick?: () => void;
}

/** One settings row: label (+ hint) on the left, value + chevron on the right. */
export default function SettingsRow({ label, value, hint, tone, onClick }: SettingsRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="flex w-full items-center justify-between gap-2.5 px-[18px] py-3.5 text-left transition-colors enabled:hover:bg-warm-100 disabled:cursor-default"
    >
      <div className="flex flex-col gap-0.5">
        <span
          className="text-[14px]"
          style={{ color: tone === 'warn' ? 'var(--color-phase-menstruation)' : 'var(--color-ink)' }}
        >
          {label}
        </span>
        {hint && <span className="hd-meta text-warm-400">{hint}</span>}
      </div>
      <div className="flex items-center gap-1.5">
        {value && <span className="text-[13px] text-warm-500">{value}</span>}
        {onClick && <span className="hd-meta text-warm-400">›</span>}
      </div>
    </button>
  );
}
