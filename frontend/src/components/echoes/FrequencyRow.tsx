// SPDX-License-Identifier: AGPL-3.0-or-later
interface FrequencyRowProps {
  glyph: string;
  label: string;
  count: number;
  total: number;
}

/** A pastille's frequency at a parent phase, as a count/total bar. */
export default function FrequencyRow({ glyph, label, count, total }: FrequencyRowProps) {
  const segments = Math.max(total, 1);
  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex min-w-[110px] items-center gap-1.5">
        <span className="inline-block w-3.5 text-center leading-none text-ink">{glyph}</span>
        <span className="text-[13px] text-ink">{label}</span>
      </span>
      <span className="flex flex-1 gap-[3px]">
        {Array.from({ length: segments }).map((_, i) => (
          <span
            key={i}
            className="h-2 flex-1 rounded-[1px]"
            style={{ background: i < count ? 'var(--color-ink)' : 'var(--color-warm-300)' }}
          />
        ))}
      </span>
      <span className="hd-meta min-w-[26px] text-right text-warm-500">
        {count}/{total}
      </span>
    </div>
  );
}
