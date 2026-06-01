// widgets.jsx — iOS widget simulations for HerDay V2.
// Small / medium / large home-screen widgets + lock-screen variants.
// iOS-standard sizing (158/338/354 base, 22pt continuous corners).

const WIDGET_RADIUS = 22;

// ─── Base widget shell ──────────────────────────────────────────────

function WidgetShell({ size = 158, height, background = 'var(--paper)', children, style = {} }) {
  return (
    <div
      style={{
        width: size,
        height: height || size,
        borderRadius: WIDGET_RADIUS,
        background,
        boxShadow:
          '0 8px 24px rgba(31, 28, 24, 0.12), 0 1px 2px rgba(31, 28, 24, 0.06), inset 0 0 0 0.5px rgba(255,255,255,0.4)',
        overflow: 'hidden',
        position: 'relative',
        color: 'var(--ink)',
        fontFamily: 'var(--f-sans)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function WidgetHeader({ phase, day, mono = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 7, height: 7, borderRadius: 2, background: mono ? 'currentColor' : phase.color }}></span>
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '0.06em', color: mono ? 'currentColor' : 'var(--ink-mute)', textTransform: 'uppercase' }}>
          HerDay
        </span>
      </div>
      <span style={{ fontFamily: 'var(--f-mono)', fontSize: 9, letterSpacing: '0.06em', color: mono ? 'currentColor' : 'var(--ink-mute)' }}>
        J{day}
      </span>
    </div>
  );
}

// ─── Small widget — Posture ─────────────────────────────────────────

function WidgetSmallPosture({ phase, day }) {
  return (
    <WidgetShell size={158} background={phase.colorSoft}>
      <div style={{ padding: 14, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <WidgetHeader phase={phase} day={day} />
        <div
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 8,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: phase.colorInk,
            opacity: 0.7,
            marginBottom: 4,
          }}
        >
          Elle a besoin que tu sois
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
          {phase.posture.slice(0, 3).map((w) => (
            <div
              key={w}
              style={{
                fontFamily: 'var(--f-serif)',
                fontSize: 15,
                letterSpacing: '0.01em',
                textTransform: 'uppercase',
                color: phase.colorInk,
                lineHeight: 1.15,
                fontWeight: 500,
              }}
            >
              {w}
            </div>
          ))}
        </div>
        <div
          style={{
            fontFamily: 'var(--f-sans)',
            fontSize: 9.5,
            color: phase.colorInk,
            opacity: 0.7,
            marginTop: 6,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>{phase.short.toLowerCase()}</span>
          <span style={{ fontFamily: 'var(--f-mono)', fontSize: 8.5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {daysLeftInPhase(day)}j restants
          </span>
        </div>
      </div>
    </WidgetShell>
  );
}

// ─── Small widget — Day ──────────────────────────────────────────────

function WidgetSmallDay({ phase, day }) {
  const range = PHASE_RANGES_28.find((r) => r.id === phase.id);
  const phaseSpan = range ? range.to - range.from + 1 : 1;
  const phaseDayIdx = range ? day - range.from + 1 : 1;
  const progress = phaseDayIdx / phaseSpan;
  return (
    <WidgetShell size={158} background={'var(--paper)'}>
      <div style={{ padding: 14, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <WidgetHeader phase={phase} day={day} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {/* Ring — progress WITHIN the current sub-phase */}
          <svg width="92" height="92" style={{ position: 'absolute' }}>
            <circle cx="46" cy="46" r="40" stroke="var(--rule)" strokeWidth="2" fill="none" />
            <circle
              cx="46"
              cy="46"
              r="40"
              stroke={phase.color}
              strokeWidth="3"
              fill="none"
              strokeDasharray={`${progress * (2 * Math.PI * 40)} 999`}
              transform="rotate(-90 46 46)"
              strokeLinecap="round"
            />
            {/* Day ticks around the ring — one per day of the sub-phase */}
            {Array.from({ length: phaseSpan }).map((_, i) => {
              const angle = (-90 + (i / phaseSpan) * 360) * (Math.PI / 180);
              const x = 46 + Math.cos(angle) * 46;
              const y = 46 + Math.sin(angle) * 46;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="1.4"
                  fill={i < phaseDayIdx ? phase.color : 'var(--rule)'}
                />
              );
            })}
          </svg>
          <div style={{ textAlign: 'center', position: 'relative' }}>
            <div style={{ fontFamily: 'var(--f-serif)', fontSize: 30, lineHeight: 1, fontWeight: 500, color: 'var(--ink)' }}>
              {phaseDayIdx}<span style={{ fontFamily: 'var(--f-sans)', fontSize: 14, color: 'var(--ink-mute)' }}>/{phaseSpan}</span>
            </div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-mute)', marginTop: 4 }}>
              dans la phase
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-soft)', textAlign: 'center', fontWeight: 500 }}>
          {phase.short}
        </div>
      </div>
    </WidgetShell>
  );
}

// ─── Medium widget — Aujourd'hui ─────────────────────────────────────

function WidgetMedium({ phase, day }) {
  return (
    <WidgetShell size={338} height={158} background={phase.colorSoft}>
      <div style={{ padding: 14, height: '100%', display: 'flex', gap: 14 }}>
        {/* Left: phase summary */}
        <div style={{ flex: '0 0 130px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <WidgetHeader phase={phase} day={day} />
          <div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase', color: phase.colorInk, opacity: 0.7, marginBottom: 2 }}>
              Phase
            </div>
            <div style={{ fontFamily: 'var(--f-sans)', fontSize: 14, fontWeight: 700, color: phase.colorInk, lineHeight: 1.15 }}>
              {phase.short}
            </div>
            <div style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 11, color: phase.colorInk, opacity: 0.65, marginTop: 2 }}>
              {phase.range.toLowerCase()}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 0.5, background: phase.color, opacity: 0.25 }}></div>

        {/* Right: posture */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase', color: phase.colorInk, opacity: 0.7, marginBottom: 6 }}>
              Elle a besoin que tu sois
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {phase.posture.slice(0, 4).map((w) => (
                <div
                  key={w}
                  style={{
                    fontFamily: 'var(--f-serif)',
                    fontSize: 17,
                    letterSpacing: '0.01em',
                    textTransform: 'uppercase',
                    color: phase.colorInk,
                    lineHeight: 1.12,
                    fontWeight: 500,
                  }}
                >
                  {w}
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 8, letterSpacing: '0.06em', color: phase.colorInk, opacity: 0.55, textTransform: 'uppercase' }}>
            {daysLeftLabel(day).toLowerCase()} · confiance élevée
          </div>
        </div>
      </div>
    </WidgetShell>
  );
}

// ─── Large widget — Tableau ──────────────────────────────────────────

function WidgetLarge({ phase, day }) {
  const echo = ECHO_SAMPLES[phase.id];
  return (
    <WidgetShell size={338} height={354} background={'var(--paper)'}>
      <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <WidgetHeader phase={phase} day={day} />

        {/* Phase summary */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div style={{ fontFamily: 'var(--f-sans)', fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>
              {phase.short}
            </div>
            <div style={{ fontFamily: 'var(--f-serif)', fontStyle: 'italic', fontSize: 12, color: 'var(--ink-mute)' }}>
              — {phase.range.toLowerCase()}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--f-serif)', fontSize: 22, fontWeight: 500, color: phase.colorInk, lineHeight: 1 }}>
              {daysLeftInPhase(day)}<span style={{ fontFamily: 'var(--f-sans)', fontSize: 11, fontWeight: 500, marginLeft: 1 }}>j</span>
            </div>
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: 8, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-mute)', marginTop: 2 }}>
              restants dans la phase
            </div>
          </div>
        </div>

        {/* Posture */}
        <div style={{ background: phase.colorSoft, borderRadius: 10, padding: '10px 12px', marginBottom: 10 }}>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase', color: phase.colorInk, opacity: 0.7, marginBottom: 4 }}>
            Elle a besoin que tu sois
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 8px', alignItems: 'baseline' }}>
            {phase.posture.map((w, i) => (
              <React.Fragment key={w}>
                <span
                  style={{
                    fontFamily: 'var(--f-serif)',
                    fontSize: 15,
                    letterSpacing: '0.01em',
                    textTransform: 'uppercase',
                    color: phase.colorInk,
                    fontWeight: 500,
                    lineHeight: 1.2,
                  }}
                >
                  {w}
                </span>
                {i < phase.posture.length - 1 && (
                  <span style={{ color: phase.colorInk, opacity: 0.4 }}>·</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Hormone mini graph */}
        <div style={{ marginBottom: 10 }}>
          <HormoneGraph currentDay={day} height={70} compact />
        </div>

        {/* Echo */}
        {echo && (
          <div style={{ borderTop: '0.5px solid var(--rule)', paddingTop: 10, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>
                Écho · cycle précédent
              </span>
              <span style={{ fontFamily: 'var(--f-mono)', fontSize: 8, letterSpacing: '0.06em', color: 'var(--green)' }}>
                A AIDÉ
              </span>
            </div>
            <div style={{ fontFamily: 'var(--f-sans)', fontSize: 11.5, lineHeight: 1.45, color: 'var(--ink-soft)' }}>
              « {echo.helpful[0]} »
            </div>
          </div>
        )}
      </div>
    </WidgetShell>
  );
}

// ─── Lock screen widgets ─────────────────────────────────────────────

function LockRectangular({ phase, day }) {
  // 160×80 rect, monochrome (iOS treats lock widgets as tint)
  return (
    <div
      style={{
        width: 160,
        height: 76,
        borderRadius: 16,
        background: 'rgba(255,255,255,0.16)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '10px 12px',
        color: 'white',
        fontFamily: 'var(--f-sans)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        border: '0.5px solid rgba(255,255,255,0.18)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7 }}>
          HerDay · J{day} · —{daysLeftInPhase(day)}j
        </span>
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: 2,
            background: 'white',
          }}
        ></span>
      </div>
      <div>
        <div style={{ fontFamily: 'var(--f-serif)', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.01em', fontWeight: 500, lineHeight: 1.1 }}>
          {phase.posture[0]} · {phase.posture[1]}
        </div>
        <div style={{ fontSize: 9.5, opacity: 0.65, marginTop: 2 }}>
          {phase.short.toLowerCase()}
        </div>
      </div>
    </div>
  );
}

function LockCircular({ phase, day }) {
  // 72x72 circular widget — progress within the current sub-phase
  const range = PHASE_RANGES_28.find((r) => r.id === phase.id);
  const phaseSpan = range ? range.to - range.from + 1 : 1;
  const phaseDayIdx = range ? day - range.from + 1 : 1;
  const progress = phaseDayIdx / phaseSpan;
  const circumference = 2 * Math.PI * 30;
  return (
    <div style={{ width: 72, height: 72, position: 'relative' }}>
      <svg width="72" height="72" style={{ position: 'absolute', inset: 0 }}>
        <circle cx="36" cy="36" r="33" fill="rgba(255,255,255,0.10)" />
        <circle cx="36" cy="36" r="30" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" fill="none" />
        <circle
          cx="36"
          cy="36"
          r="30"
          stroke="white"
          strokeWidth="3"
          fill="none"
          strokeDasharray={`${progress * circumference} 999`}
          transform="rotate(-90 36 36)"
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: 'var(--f-sans)',
        }}
      >
        <span style={{ fontFamily: 'var(--f-serif)', fontSize: 15, lineHeight: 1, fontWeight: 500 }}>
          {phaseDayIdx}<span style={{ fontFamily: 'var(--f-sans)', fontSize: 9, opacity: 0.7 }}>/{phaseSpan}</span>
        </span>
        <span style={{ fontFamily: 'var(--f-mono)', fontSize: 7, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.7, marginTop: 2 }}>
          {phase.short.slice(0, 7)}
        </span>
      </div>
    </div>
  );
}

function LockInline({ phase, day }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        color: 'white',
        fontFamily: 'var(--f-sans)',
        fontSize: 12.5,
        padding: '3px 10px',
        background: 'rgba(255,255,255,0.10)',
        borderRadius: 999,
        backdropFilter: 'blur(20px)',
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: 999, background: 'white' }}></span>
      <span style={{ opacity: 0.75 }}>HerDay</span>
      <span style={{ opacity: 0.4 }}>›</span>
      <span style={{ fontFamily: 'var(--f-serif)', textTransform: 'uppercase', letterSpacing: '0.02em', fontWeight: 500 }}>
        {phase.posture[0]} · {phase.posture[1]}
      </span>
    </div>
  );
}

// ─── In-context mockups ──────────────────────────────────────────────

// A wallpaper background for showcasing widgets in context. Soft warm gradient.
function Wallpaper({ children, dark = false }) {
  const bg = dark
    ? 'radial-gradient(120% 80% at 30% 20%, #2a2820 0%, #14130f 70%)'
    : 'radial-gradient(120% 80% at 30% 20%, #d4c4a0 0%, #8b7e62 60%, #4a4233 100%)';
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        position: 'relative',
      }}
    >
      {children}
    </div>
  );
}

// Lock screen mock — clock on top, widgets below
function LockScreenMock({ phase, day }) {
  return (
    <Wallpaper dark>
      <div style={{ width: '100%', height: '100%', position: 'relative', color: 'white', fontFamily: 'var(--f-sans)' }}>
        {/* Time */}
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--f-mono)', fontSize: 14, letterSpacing: '0.1em', opacity: 0.7 }}>
            JEUDI 28 MAI
          </div>
          <div style={{ fontFamily: 'var(--f-serif)', fontSize: 86, lineHeight: 1, fontWeight: 300, letterSpacing: '-0.02em', marginTop: 4 }}>
            9:41
          </div>
        </div>

        {/* Inline widget under the time */}
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <LockInline phase={phase} day={day} />
        </div>

        {/* Bottom row of lock widgets */}
        <div
          style={{
            position: 'absolute',
            bottom: 56,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <LockCircular phase={phase} day={day} />
          <LockRectangular phase={phase} day={day} />
        </div>
      </div>
    </Wallpaper>
  );
}

// Home screen mock — show widgets together
function HomeScreenMock({ phase, day }) {
  return (
    <Wallpaper>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <WidgetMedium phase={phase} day={day} />
        <div style={{ display: 'flex', gap: 16 }}>
          <WidgetSmallPosture phase={phase} day={day} />
          <WidgetSmallDay phase={phase} day={day} />
        </div>
      </div>
    </Wallpaper>
  );
}

// Soft frame for showing a widget on its own (artboard) — pale neutral.
function WidgetCanvasFrame({ children }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#e7e0d2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
  );
}

Object.assign(window, {
  WidgetShell,
  WidgetSmallPosture,
  WidgetSmallDay,
  WidgetMedium,
  WidgetLarge,
  LockRectangular,
  LockCircular,
  LockInline,
  LockScreenMock,
  HomeScreenMock,
  WidgetCanvasFrame,
});
