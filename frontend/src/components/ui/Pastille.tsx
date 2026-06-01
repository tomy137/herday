// SPDX-License-Identifier: AGPL-3.0-or-later
interface PastilleProps {
  /** Typographic glyph (not emoji), rendered in a fixed-width slot. */
  glyph: string;
  label: string;
  selected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

/**
 * Toggleable journal pastille (pill). When selected, fills with ink.
 */
export default function Pastille({ glyph, label, selected, onToggle, disabled }: PastilleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      data-selected={selected}
      aria-pressed={selected}
      className={`inline-flex items-center gap-[7px] rounded-full border-[0.5px] px-[11px] py-[7px] text-[13px] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 ${
        selected
          ? 'border-ink bg-ink text-warm-50'
          : 'border-warm-300 bg-warm-50 text-ink hover:bg-warm-100'
      }`}
    >
      <span className="inline-block w-3.5 text-center leading-none">{glyph}</span>
      <span>{label}</span>
    </button>
  );
}
