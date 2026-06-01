// hormone-graph.jsx — Editorial redo of the cycle hormone chart.
// Four curves over a 28-day reference; phase bands as soft background;
// current-day marker with a "TU ES ICI" annotation.

function HormoneGraph({ currentDay = 24, height = 200, compact = false }) {
  const W = 350;
  const H = height;
  const padL = 18;
  const padR = 14;
  const padT = compact ? 14 : 28;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const cycleLen = 28;
  const xFor = (d) => padL + ((d - 1) / (cycleLen - 1)) * innerW;
  const yFor = (v) => padT + (1 - v) * innerH; // v in 0..1

  // Sampled curve points for each hormone — values in 0..1
  // Tuned by hand to feel right and match the medical archetype.
  const samples = [];
  for (let d = 1; d <= cycleLen; d += 0.25) samples.push(d);

  const estradiol = (d) => {
    // small rise during follicular, peak at J13 (~0.85), dip at ovulation,
    // second hump centered around J21 (~0.55), then drop.
    const a = 0.85 * Math.exp(-Math.pow((d - 13) / 4.0, 2));
    const b = 0.55 * Math.exp(-Math.pow((d - 21) / 4.5, 2));
    const base = 0.12 + 0.04 * Math.sin(d / 3);
    return Math.max(0.05, Math.min(0.95, base + a + b));
  };

  const progesterone = (d) => {
    if (d < 14) return 0.06 + 0.02 * Math.sin(d);
    const peak = 0.7 * Math.exp(-Math.pow((d - 21) / 4.0, 2));
    return Math.max(0.05, 0.08 + peak);
  };

  const lh = (d) => {
    const spike = 0.95 * Math.exp(-Math.pow((d - 14) / 0.9, 2));
    return Math.max(0.08, 0.1 + spike);
  };

  const fsh = (d) => {
    const a = 0.25 * Math.exp(-Math.pow((d - 3) / 2.5, 2));
    const b = 0.45 * Math.exp(-Math.pow((d - 14) / 1.5, 2));
    return Math.max(0.08, 0.1 + a + b);
  };

  const path = (fn) =>
    samples
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(d).toFixed(2)} ${yFor(fn(d)).toFixed(2)}`)
      .join(' ');

  const currentX = xFor(currentDay);
  const phase = phaseForDay(Math.round(currentDay));

  return (
    <div style={{ width: '100%' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Phase bands */}
        {PHASE_RANGES_28.map((r) => {
          const x1 = xFor(r.from);
          const x2 = xFor(r.to);
          const p = PHASE_BY_ID[r.id];
          return (
            <rect
              key={r.id}
              x={x1}
              y={padT - 4}
              width={x2 - x1}
              height={innerH + 8}
              fill={p.colorSoft}
              opacity="0.35"
            />
          );
        })}

        {/* Baseline grid: just two faint horizontals */}
        <line
          x1={padL}
          x2={W - padR}
          y1={yFor(0)}
          y2={yFor(0)}
          stroke="var(--rule)"
          strokeWidth="0.5"
        />

        {/* FSH — faintest, dotted */}
        <path
          d={path(fsh)}
          fill="none"
          stroke="var(--ink-faint)"
          strokeWidth="1"
          strokeDasharray="1.5 2.5"
          opacity="0.7"
        />
        {/* LH — dotted, slightly darker */}
        <path
          d={path(lh)}
          fill="none"
          stroke="var(--ink-mute)"
          strokeWidth="1"
          strokeDasharray="2 2"
          opacity="0.85"
        />
        {/* Progesterone — dashed, mid weight */}
        <path
          d={path(progesterone)}
          fill="none"
          stroke="var(--ink-soft)"
          strokeWidth="1.4"
          strokeDasharray="5 3"
        />
        {/* Estradiol — solid, main curve */}
        <path
          d={path(estradiol)}
          fill="none"
          stroke="var(--ink)"
          strokeWidth="1.8"
        />

        {/* X axis day ticks */}
        {[1, 7, 14, 21, 28].map((d) => (
          <g key={d}>
            <line
              x1={xFor(d)}
              x2={xFor(d)}
              y1={H - padB + 2}
              y2={H - padB + 6}
              stroke="var(--ink-faint)"
              strokeWidth="0.5"
            />
            <text
              x={xFor(d)}
              y={H - padB + 17}
              textAnchor="middle"
              fontFamily="var(--f-mono)"
              fontSize="9"
              fill="var(--ink-mute)"
              letterSpacing="0.05em"
            >
              J{d}
            </text>
          </g>
        ))}

        {/* Current day marker */}
        <line
          x1={currentX}
          x2={currentX}
          y1={padT - 8}
          y2={H - padB}
          stroke="var(--accent)"
          strokeWidth="1"
        />
        <circle cx={currentX} cy={yFor(estradiol(currentDay))} r="3.5" fill="var(--accent)" />
        <circle cx={currentX} cy={yFor(estradiol(currentDay))} r="6" fill="var(--accent)" fillOpacity="0.18" />

        {/* "TU ES ICI" annotation */}
        {!compact && (
          <g>
            <text
              x={currentX + (currentDay > 20 ? -8 : 8)}
              y={padT - 12}
              textAnchor={currentDay > 20 ? 'end' : 'start'}
              fontFamily="var(--f-mono)"
              fontSize="9"
              fill="var(--accent)"
              letterSpacing="0.08em"
            >
              TU ES ICI · J{Math.round(currentDay)}
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      {!compact && (
        <div
          style={{
            display: 'flex',
            gap: 14,
            paddingLeft: 18,
            paddingTop: 8,
            fontFamily: 'var(--f-mono)',
            fontSize: 9.5,
            letterSpacing: '0.04em',
            color: 'var(--ink-mute)',
            flexWrap: 'wrap',
          }}
        >
          <LegendItem dash="solid" label="ŒSTRADIOL" />
          <LegendItem dash="dashed" label="PROGESTÉRONE" />
          <LegendItem dash="dotted" label="LH" />
          <LegendItem dash="dotted-faint" label="FSH" />
        </div>
      )}
    </div>
  );
}

function LegendItem({ dash, label }) {
  const stroke =
    dash === 'solid'
      ? 'var(--ink)'
      : dash === 'dashed'
      ? 'var(--ink-soft)'
      : dash === 'dotted'
      ? 'var(--ink-mute)'
      : 'var(--ink-faint)';
  const dashArr =
    dash === 'solid'
      ? ''
      : dash === 'dashed'
      ? '5 3'
      : dash === 'dotted'
      ? '2 2'
      : '1.5 2.5';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <svg width="22" height="6">
        <line
          x1="0"
          x2="22"
          y1="3"
          y2="3"
          stroke={stroke}
          strokeWidth={dash === 'solid' ? 1.6 : 1.2}
          strokeDasharray={dashArr}
        />
      </svg>
      <span>{label}</span>
    </span>
  );
}

Object.assign(window, { HormoneGraph });
