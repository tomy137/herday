// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState, type ReactNode } from 'react';

interface AccordionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * Editorial dividing-rule accordion ("Ce que tu peux observer/proposer/éviter").
 */
export default function Accordion({ title, defaultOpen = false, children }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t-[0.5px] border-warm-300 py-3.5" data-open={open}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left select-none"
      >
        <span className="text-[15px] font-medium text-ink">{title}</span>
        <span
          className="hd-meta text-warm-500 transition-transform duration-200"
          style={{ transform: open ? 'rotate(90deg)' : 'none' }}
          aria-hidden="true"
        >
          ›
        </span>
      </button>
      {open && <div className="flex flex-col gap-3.5 pt-3.5">{children}</div>}
    </div>
  );
}
