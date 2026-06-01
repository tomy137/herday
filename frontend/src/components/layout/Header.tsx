// SPDX-License-Identifier: AGPL-3.0-or-later
import { useTranslation } from 'react-i18next';

interface HeaderProps {
  /** Right-hand meta label (uppercased). Defaults to today's date. */
  rightLabel?: string;
}

export default function Header({ rightLabel }: HeaderProps) {
  const { i18n } = useTranslation();
  const right =
    rightLabel ??
    new Intl.DateTimeFormat(i18n.language, { weekday: 'short', day: 'numeric', month: 'short' })
      .format(new Date())
      .replace(/\./g, '')
      .toUpperCase();

  return (
    <header className="flex items-center justify-between px-[22px] pb-3 pt-4">
      <div className="text-[19px] font-semibold tracking-tight text-ink">
        HerDay<sup className="hd-meta ml-0.5 align-super text-warm-500">V2</sup>
      </div>
      <span className="hd-meta text-warm-500">{right}</span>
    </header>
  );
}
