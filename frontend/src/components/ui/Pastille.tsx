// SPDX-License-Identifier: AGPL-3.0-or-later
import { useRef } from 'react';

interface PastilleProps {
  /** Typographic glyph (not emoji), rendered in a fixed-width slot. */
  glyph: string;
  label: string;
  selected: boolean;
  onToggle: () => void;
  /** Long press (≈ ½ s) — shows the pastille's definition instead of toggling. */
  onLongPress?: () => void;
  disabled?: boolean;
}

const LONG_PRESS_MS = 500;

/**
 * Toggleable journal pastille (pill). When selected, fills with ink.
 */
export default function Pastille({ glyph, label, selected, onToggle, onLongPress, disabled }: PastilleProps) {
  const timer = useRef<number | null>(null);
  const longPressed = useRef(false);

  const start = () => {
    if (!onLongPress) return;
    longPressed.current = false;
    timer.current = window.setTimeout(() => {
      longPressed.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  };
  const cancel = () => {
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = null;
  };

  return (
    <button
      type="button"
      onClick={() => {
        if (longPressed.current) {
          longPressed.current = false;
          return;
        }
        onToggle();
      }}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onContextMenu={(e) => onLongPress && e.preventDefault()}
      disabled={disabled}
      data-selected={selected}
      aria-pressed={selected}
      className={`inline-flex min-h-[38px] select-none items-center gap-[7px] rounded-full border px-[11px] text-[13px] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 ${
        selected
          ? 'border-ink bg-ink font-bold text-warm-50'
          : 'border-warm-300 bg-warm-100 text-ink hover:bg-warm-200'
      }`}
    >
      <span className="inline-block w-3.5 text-center leading-none">{glyph}</span>
      <span>{label}</span>
    </button>
  );
}
