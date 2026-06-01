// SPDX-License-Identifier: AGPL-3.0-or-later
import { Children, Fragment, type ReactNode } from 'react';

interface SettingsGroupProps {
  title: string;
  status?: string;
  children: ReactNode;
}

/** A titled group of settings rows inside a bordered card, with thin dividers. */
export default function SettingsGroup({ title, status, children }: SettingsGroupProps) {
  const rows = Children.toArray(children);
  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="hd-caps text-warm-500">{title}</span>
        {status && (
          <span className="hd-meta" style={{ color: 'var(--color-phase-pre-ovulatory)' }}>
            ● {status}
          </span>
        )}
      </div>
      <div className="overflow-hidden rounded-[14px] border-[0.5px] border-warm-300 bg-warm-50">
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 && <div className="hd-rule-soft" />}
            {row}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
