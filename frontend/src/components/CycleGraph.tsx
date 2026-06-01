import type { Phase } from '../lib/cycle-engine';
import { PHASE_HEX } from '../constants/phases';

interface Props {
  dayInCycle: number;
  cycleLength: number;
  phase?: Phase | null;
  periodDuration?: number;
}

const VBW = 600;
const VBH = 220;
const LEFT = 32;
const RIGHT = 584;
const TOP = 24;
const BOTTOM = 178;
const CW = RIGHT - LEFT;
const CH = BOTTOM - TOP;
const PRE_OVULATORY_DAYS = 2;
const PRE_MENSTRUAL_DAYS = 6;

// x position for a continuous day value in [0, cycleLength]
function x(d: number, L: number) {
  return LEFT + (d / L) * CW;
}
// y position for a normalized value in [0, 1] (1 = top of chart)
function y(v: number) {
  return BOTTOM - v * CH;
}

function phaseRanges(L: number, period: number) {
  const ovuDay = L - 14;
  const ovuStart = ovuDay - 2;
  const ovuEnd = ovuDay + 2;
  return [
    { phase: 'menstruation' as Phase, start: 1, end: period },
    { phase: 'post_menstrual' as Phase, start: period + 1, end: ovuStart - PRE_OVULATORY_DAYS - 1 },
    { phase: 'pre_ovulatory' as Phase, start: ovuStart - PRE_OVULATORY_DAYS, end: ovuStart - 1 },
    { phase: 'ovulation' as Phase, start: ovuStart, end: ovuEnd },
    { phase: 'post_ovulatory' as Phase, start: ovuEnd + 1, end: L - PRE_MENSTRUAL_DAYS },
    { phase: 'pre_menstrual' as Phase, start: L - PRE_MENSTRUAL_DAYS + 1, end: L },
  ];
}

// Smooth a sequence of (x, y) points with horizontal cubic Bezier handles.
function smoothPath(pts: Array<[number, number]>): string {
  if (pts.length === 0) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const mid = (px + cx) / 2;
    d += ` C ${mid} ${py}, ${mid} ${cy}, ${cx} ${cy}`;
  }
  return d;
}

// Hormone curves anchored on ovulation day (L − 14) so they scale with cycle length.
function buildCurves(L: number, period: number) {
  const ovu = L - 14;
  const lutealEnd = L;
  const pts = (raw: Array<[number, number]>): Array<[number, number]> =>
    raw.map(([d, v]) => [x(d, L), y(v)]);
  return {
    estradiol: pts([
      [0, 0.15],
      [period * 0.6, 0.10],
      [period + 1, 0.20],
      [(period + ovu) / 2, 0.35],
      [ovu - 1, 0.85],
      [ovu + 1, 0.45],
      [ovu + (lutealEnd - ovu) * 0.4, 0.62],
      [lutealEnd - 2, 0.22],
      [lutealEnd, 0.10],
    ]),
    progesterone: pts([
      [0, 0.08],
      [ovu - 1, 0.08],
      [ovu + 1, 0.22],
      [ovu + (lutealEnd - ovu) * 0.5, 0.78],
      [lutealEnd - 2, 0.30],
      [lutealEnd, 0.05],
    ]),
    fsh: pts([
      [0, 0.32],
      [period - 1, 0.28],
      [period + 2, 0.18],
      [ovu - 2, 0.22],
      [ovu, 0.48],
      [ovu + 2, 0.18],
      [lutealEnd - 3, 0.12],
      [lutealEnd, 0.10],
    ]),
    lh: pts([
      [0, 0.10],
      [ovu - 3, 0.10],
      [ovu - 0.5, 0.40],
      [ovu, 0.95],
      [ovu + 0.5, 0.55],
      [ovu + 2, 0.18],
      [lutealEnd, 0.10],
    ]),
  };
}

function dayLabels(L: number): number[] {
  // Dense weekly labels, always include J1 and the last day.
  const labels = new Set<number>([1, L]);
  for (let d = 7; d < L; d += 7) labels.add(d);
  return Array.from(labels).sort((a, b) => a - b);
}

export default function CycleGraph({
  dayInCycle,
  cycleLength,
  phase,
  periodDuration = 5,
}: Props) {
  const L = cycleLength && cycleLength >= 18 ? cycleLength : 28;
  const ranges = phaseRanges(L, periodDuration);
  const curves = buildCurves(L, periodDuration);

  const showCursor = dayInCycle > 0 && dayInCycle <= L;
  const cursorX = showCursor ? x(dayInCycle - 0.5, L) : 0;
  const cursorColor = phase ? PHASE_HEX[phase] : '#5D3A9E';

  return (
    <svg
      viewBox={`0 0 ${VBW} ${VBH}`}
      className="w-full h-auto select-none"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Variations hormonales sur le cycle"
    >
      {/* Phase background bands (selected phase stands out) */}
      {ranges.map((r) => {
        const x1 = LEFT + ((r.start - 1) / L) * CW;
        const x2 = LEFT + (r.end / L) * CW;
        const isSelected = phase === r.phase;
        return (
          <rect
            key={r.phase}
            x={x1}
            y={TOP}
            width={x2 - x1}
            height={CH}
            fill={PHASE_HEX[r.phase]}
            opacity={isSelected ? 0.32 : 0.06}
          />
        );
      })}

      {/* Phase separators (subtle) */}
      {ranges.slice(0, -1).map((r) => {
        const xEdge = LEFT + (r.end / L) * CW;
        return (
          <line
            key={r.phase + '-sep'}
            x1={xEdge}
            x2={xEdge}
            y1={TOP}
            y2={BOTTOM}
            stroke="#fff"
            strokeWidth={1}
            opacity={0.5}
          />
        );
      })}

      {/* Baseline */}
      <line x1={LEFT} x2={RIGHT} y1={BOTTOM} y2={BOTTOM} stroke="#D9D2C0" strokeWidth={1} />

      {/* Hormone curves */}
      <path d={smoothPath(curves.fsh)} fill="none" stroke="#888" strokeWidth={1.4} strokeDasharray="3 2" opacity={0.55} />
      <path d={smoothPath(curves.lh)} fill="none" stroke="#444" strokeWidth={1.4} strokeDasharray="2 2" opacity={0.65} />
      <path d={smoothPath(curves.estradiol)} fill="none" stroke="#DC3D5A" strokeWidth={2.4} />
      <path d={smoothPath(curves.progesterone)} fill="none" stroke="#7E4FD0" strokeWidth={2.4} strokeDasharray="5 3" />

      {/* Cursor */}
      {showCursor && (
        <>
          <line
            x1={cursorX}
            x2={cursorX}
            y1={TOP - 6}
            y2={BOTTOM + 4}
            stroke={cursorColor}
            strokeWidth={1.6}
          />
          <circle cx={cursorX} cy={TOP - 6} r={5.5} fill={cursorColor} stroke="#fff" strokeWidth={2} />
        </>
      )}

      {/* X axis day labels */}
      {dayLabels(L).map((d) => {
        const xLabel = x(d - 0.5, L);
        return (
          <text key={d} x={xLabel} y={BOTTOM + 16} textAnchor="middle" fontSize={11} fill="#999" fontFamily="DM Sans, sans-serif">
            J{d}
          </text>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${LEFT}, ${VBH - 8})`} fontSize={10} fontFamily="DM Sans, sans-serif" fill="#666">
        <line x1={0} x2={14} y1={-3} y2={-3} stroke="#DC3D5A" strokeWidth={2.4} />
        <text x={18} y={0}>Œstradiol</text>

        <line x1={84} x2={98} y1={-3} y2={-3} stroke="#7E4FD0" strokeWidth={2.4} strokeDasharray="5 3" />
        <text x={102} y={0}>Progestérone</text>

        <line x1={186} x2={200} y1={-3} y2={-3} stroke="#444" strokeWidth={1.4} strokeDasharray="2 2" />
        <text x={204} y={0}>LH</text>

        <line x1={226} x2={240} y1={-3} y2={-3} stroke="#888" strokeWidth={1.4} strokeDasharray="3 2" />
        <text x={244} y={0}>FSH</text>
      </g>
    </svg>
  );
}
