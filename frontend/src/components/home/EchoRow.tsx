// SPDX-License-Identifier: AGPL-3.0-or-later
interface EchoRowProps {
  tone: 'helpful' | 'avoid';
  label: string;
  item: string;
}

/** One "Helped / Didn't help" line, shared by EchoCard and the Echoes screen. */
export default function EchoRow({ tone, label, item }: EchoRowProps) {
  const color = tone === 'helpful' ? 'var(--color-phase-pre-ovulatory)' : 'var(--color-phase-menstruation)';
  return (
    <div className="flex items-start gap-3">
      <span
        className="hd-meta min-w-[76px] pt-1 uppercase"
        style={{ color, letterSpacing: '0.08em', fontSize: '9px' }}
      >
        {label}
      </span>
      <span className="text-[13.5px] leading-snug text-ink-soft">{item}</span>
    </div>
  );
}
