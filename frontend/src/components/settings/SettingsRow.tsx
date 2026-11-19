// SPDX-License-Identifier: AGPL-3.0-or-later
interface SettingsRowProps {
  label: string;
  value?: string;
  hint?: string;
  tone?: 'warn';
  onClick?: () => void;
  /** Set for a row that folds/unfolds content below it (accordion) instead of opening a page. */
  expanded?: boolean;
}

/**
 * One settings row: label (+ hint) on the left, value + chevron on the right.
 * The chevron tells the action apart: › opens another page, ⌄/⌃ unfolds content in place.
 */
export default function SettingsRow({ label, value, hint, tone, onClick, expanded }: SettingsRowProps) {
  const isDisclosure = expanded !== undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      aria-expanded={isDisclosure ? expanded : undefined}
      className="flex w-full items-center justify-between gap-2.5 px-[18px] py-3.5 text-left transition-colors enabled:hover:bg-warm-200 disabled:cursor-default"
    >
      <div className="flex flex-col gap-0.5">
        <span
          className="text-[14px]"
          style={{ color: tone === 'warn' ? 'var(--color-danger)' : 'var(--color-ink)' }}
        >
          {label}
        </span>
        {hint && <span className="text-[12px] leading-snug text-warm-500">{hint}</span>}
      </div>
      <div className="flex items-center gap-1.5">
        {value && <span className="text-[13px] text-warm-500">{value}</span>}
        {onClick && isDisclosure && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-warm-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        )}
        {onClick && !isDisclosure && <span className="hd-meta text-warm-400">›</span>}
      </div>
    </button>
  );
}
