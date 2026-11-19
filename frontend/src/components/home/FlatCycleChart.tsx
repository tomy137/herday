import type { Phase } from '../../lib/cycle-engine';
import { PHASE_ZONE, ZONE_HEX, ZONE_INK_HEX, ZONE_ORDER } from '../../constants/phases';
import { zoneBounds } from '../../lib/zones';

/**
 * Flat cycle chart of the Home card: zone bands (current one stronger), estradiol (solid)
 * and progesterone (dashed), cursor on today. Same drawing as the medium widget
 * (FlatCycleChart in HerDayWidget.swift), in the theme's curve colours.
 */

const PERIOD_DURATION_GUESS = 5;

type Pt = [number, number];

/** Smoothstep interpolation between control points (day, level 0…1). */
function level(pts: Pt[], d: number): number {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    if (d <= bx) {
      const span = bx - ax;
      const u = span > 0 ? Math.min(1, Math.max(0, (d - ax) / span)) : 1;
      return ay + (by - ay) * u * u * (3 - 2 * u);
    }
  }
  return pts[pts.length - 1][1];
}

/** Control points anchored on ovulation (L − 14), as in the widget. */
function estradiol(L: number, P: number): Pt[] {
  const o = L - 14;
  return [[0, 0.15], [P * 0.6, 0.1], [P + 1, 0.2], [(P + o) / 2, 0.35], [o - 1, 0.85], [o + 1, 0.45],
    [o + (L - o) * 0.4, 0.62], [L - 2, 0.22], [L, 0.1]];
}

function progesterone(L: number): Pt[] {
  const o = L - 14;
  return [[0, 0.08], [o - 1, 0.08], [o + 1, 0.22], [o + (L - o) * 0.5, 0.78], [L - 2, 0.3], [L, 0.05]];
}

function curve(pts: Pt[], L: number): string {
  let d = '';
  for (let t = 0; t <= L; t += 0.25) {
    d += `${t === 0 ? 'M' : 'L'} ${t.toFixed(2)} ${(1 - level(pts, t) * 0.92).toFixed(3)} `;
  }
  return d;
}

interface Props {
  dayInCycle: number;
  cycleLength: number;
  phase: Phase;
  height?: number;
}

export default function FlatCycleChart({ dayInCycle, cycleLength, phase, height = 56 }: Props) {
  const L = Math.max(cycleLength, 18);
  const current = PHASE_ZONE[phase];
  const bounds = zoneBounds(L, PERIOD_DURATION_GUESS);
  const bands: { key: string; from: number; to: number; zone: typeof current }[] = [];
  for (const z of ZONE_ORDER) {
    const b = bounds[z];
    if (!b) continue;
    if (b[1] > L) {
      bands.push({ key: `${z}-end`, from: b[0] - 1, to: L, zone: z });
      bands.push({ key: `${z}-start`, from: 0, to: b[1] - L, zone: z });
    } else {
      bands.push({ key: z, from: b[0] - 1, to: b[1], zone: z });
    }
  }
  const cursor = Math.min(Math.max(dayInCycle, 1), L) - 0.5;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${L} 1`}
      preserveAspectRatio="none"
      className="block overflow-hidden rounded-md"
      aria-hidden="true"
    >
      {bands.map((b) => (
        <rect
          key={b.key}
          x={b.from}
          y={0}
          width={b.to - b.from}
          height={1}
          style={{ fill: ZONE_HEX[b.zone], fillOpacity: b.zone === current ? 0.3 : 0.1 }}
        />
      ))}
      <path
        d={curve(estradiol(L, PERIOD_DURATION_GUESS), L)}
        fill="none"
        strokeWidth={1.6}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={{ stroke: 'var(--color-curve-estradiol)' }}
      />
      <path
        d={curve(progesterone(L), L)}
        fill="none"
        strokeWidth={1.6}
        strokeDasharray="3 2"
        vectorEffect="non-scaling-stroke"
        style={{ stroke: 'var(--color-curve-progesterone)' }}
      />
      <line
        x1={cursor}
        x2={cursor}
        y1={0}
        y2={1}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        style={{ stroke: ZONE_INK_HEX[current] }}
      />
    </svg>
  );
}
