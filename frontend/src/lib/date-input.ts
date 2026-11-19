import type { MouseEvent } from 'react';

/**
 * onClick for `<input type="date">`: open the browser's date picker on every tap.
 * On Android Chrome a tap often only focuses the field (one day/month/year segment, no
 * keyboard, no picker), and an invisible overlay input opens it one tap out of two.
 */
export function openDatePicker(e: MouseEvent<HTMLInputElement>) {
  const input = e.currentTarget;
  if (input.disabled || input.readOnly) return;
  try {
    input.showPicker?.();
  } catch {
    // Unsupported or refused (already open…): keep the browser's own behaviour.
  }
}
