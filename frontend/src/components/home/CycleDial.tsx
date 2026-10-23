// SPDX-License-Identifier: AGPL-3.0-or-later
import { useTranslation } from 'react-i18next';
import type { Phase } from '../../lib/cycle-engine';
import { PHASE_ZONE, ZONE_HEX, ZONE_INK_HEX, ZONE_ORDER } from '../../constants/phases';
import { ZONE_ICON_PATHS, zoneBounds } from '../../lib/zones';

interface CycleDialProps {
  dayInCycle: number;
  cycleLength: number;
  phase: Phase;
  /** Days left in the current zone (0 = last day); hides the line when null. */
  zoneEndsIn: number | null;
  size?: number;
}

const C = 150; // viewBox centre (300×300)
const R_IN = 98;
const R_OUT = 148;

const round = (n: number) => Math.round(n * 100) / 100;

function polar(r: number, deg: number): [number, number] {
  const t = ((deg - 90) * Math.PI) / 180;
  return [round(C + r * Math.cos(t)), round(C + r * Math.sin(t))];
}

function sector(r0: number, r1: number, a0: number, a1: number): string {
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x1, y1] = polar(r1, a0);
  const [x2, y2] = polar(r1, a1);
  const [x3, y3] = polar(r0, a1);
  const [x4, y4] = polar(r0, a0);
  return `M${x1} ${y1}A${r1} ${r1} 0 ${large} 1 ${x2} ${y2}L${x3} ${y3}A${r0} ${r0} 0 ${large} 0 ${x4} ${y4}Z`;
}

function pointer(a: number): string {
  const [tx, ty] = polar(118, a);
  const [ax, ay] = polar(70, a - 12);
  const [bx, by] = polar(70, a + 12);
  const [mx, my] = polar(66, a);
  return `M${tx} ${ty}L${ax} ${ay}Q${mx} ${my} ${bx} ${by}Z`;
}

/**
 * The four-moment dial: the current zone in full colour, an inward pointer on
 * today, and the zone's icon, name and days left in the centre. The ovulation
 * day sits at the top (the « sun » is up).
 */
export default function CycleDial({ dayInCycle, cycleLength, phase, zoneEndsIn, size = 240 }: CycleDialProps) {
  const { t } = useTranslation('phases');
  const L = cycleLength >= 18 ? cycleLength : 28;
  const offset = -((L - 14 - 0.5) / L) * 360;
  const angle = (d: number) => offset + (d / L) * 360;
  const current = PHASE_ZONE[phase];
  const bounds = zoneBounds(L);
  const today = angle(Math.min(Math.max(dayInCycle, 1), L) - 0.5);
  const remaining =
    zoneEndsIn == null ? null : zoneEndsIn <= 0 ? t('dial.last_day') : t('dial.days_left', { count: zoneEndsIn });

  return (
    <div className="relative self-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 300 300" role="img" aria-label={`${t(`zones.${current}`)} · J${dayInCycle}`}>
        {ZONE_ORDER.map((z) => {
          const b = bounds[z];
          if (!b) return null;
          return (
            <path
              key={z}
              d={sector(R_IN, R_OUT, angle(b[0] - 1) + 1.5, angle(b[1]) - 1.5)}
              style={{ fill: ZONE_HEX[z], opacity: z === current ? 1 : 0.22 }}
            />
          );
        })}
        {ZONE_ORDER.map((z) => {
          const b = bounds[z];
          if (!b) return null;
          const [x, y] = polar((R_IN + R_OUT) / 2, angle((b[0] - 1 + b[1]) / 2));
          const s = z === current ? 24 : 20;
          return (
            <path
              key={`${z}-icon`}
              d={ZONE_ICON_PATHS[z]}
              transform={`translate(${round(x - s / 2)} ${round(y - s / 2)}) scale(${round(s / 24)})`}
              fill="none"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ stroke: z === current ? 'var(--color-zone-on)' : ZONE_INK_HEX[z], opacity: z === current ? 1 : 0.8 }}
            />
          );
        })}
        <path d={pointer(today)} strokeWidth={4} strokeLinejoin="round" style={{ fill: 'var(--color-ink)', stroke: 'var(--color-warm-50)' }} />
        <circle cx={C} cy={C} r={84} style={{ fill: 'var(--color-surface)' }} />
        <path
          d={ZONE_ICON_PATHS[current]}
          transform={`translate(${C - 22} ${112 - 22}) scale(${round(44 / 24)})`}
          fill="none"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ stroke: ZONE_INK_HEX[current] }}
        />
      </svg>
      <div
        className="pointer-events-none absolute flex flex-col items-center gap-0.5 text-center"
        style={{ top: size * 0.55, left: size * 0.19, right: size * 0.19 }}
      >
        <div className="text-[20px] font-bold leading-tight text-ink">{t(`zones.${current}`)}</div>
        {remaining && <div className="text-[12px] text-ink-soft">{remaining}</div>}
      </div>
    </div>
  );
}
