// screens-home.jsx — The central screen.

function PhaseCard({ phase, currentDay, onOverride }) {
  const daysLeft = daysLeftInPhase(currentDay);
  return (
    <div className="hd-card-flat" style={{ background: phase.colorSoft + '70', borderRadius: 14, padding: '20px 20px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <PhaseTag phase={phase} suffix={`J${currentDay}`} />
          <h2 style={{ fontSize: 22, marginTop: 8, lineHeight: 1.18, fontWeight: 700, letterSpacing: '-0.005em' }}>
            {phase.name}{' '}
            <span className="serif-i" style={{ fontWeight: 400, color: 'var(--ink-mute)', fontSize: 18 }}>
              — {phase.range.toLowerCase()}
            </span>
          </h2>
          <p style={{ marginTop: 10, fontSize: 14.5, lineHeight: 1.55, color: 'var(--ink-soft)', textWrap: 'pretty' }}>
            {phase.headline}
          </p>
        </div>
        <Confidence level="élevée" value={4} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0 12px' }}>
        <PhaseProgress phase={phase} currentDay={currentDay} />
        <span className="mono" style={{ fontSize: 10, color: phase.colorInk, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
          {daysLeftLabel(currentDay).toUpperCase()}
        </span>
      </div>

      <div style={{ height: 0.5, background: phase.color + '30', margin: '6px 0 14px' }}></div>

      <div className="caps ink-mute" style={{ marginBottom: 12 }}>
        Elle a besoin que tu sois :
      </div>
      <PostureRail words={phase.posture} />

      <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
        <button className="hd-btn hd-btn-text" style={{ padding: '8px 0', fontSize: 12 }} onClick={onOverride}>
          → je l’observe différemment
        </button>
      </div>
    </div>
  );
}

// Tiny progress strip showing position within the current sub-phase.
function PhaseProgress({ phase, currentDay }) {
  const range = PHASE_RANGES_28.find((r) => r.id === phase.id);
  if (!range) return null;
  const span = range.to - range.from + 1;
  const idx = currentDay - range.from + 1;
  return (
    <span style={{ display: 'inline-flex', gap: 3, flex: '0 0 auto' }}>
      {Array.from({ length: span }).map((_, i) => (
        <span
          key={i}
          style={{
            width: 14,
            height: 4,
            borderRadius: 1,
            background: i < idx ? phase.color : phase.color + '38',
          }}
        ></span>
      ))}
    </span>
  );
}

function EchoCard({ phase }) {
  const echo = ECHO_SAMPLES[phase.id];
  if (!echo) return null;
  return (
    <div className="hd-card" style={{ borderColor: 'var(--rule)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span className="caps ink-mute">Écho · cycle précédent</span>
        <span className="mono ink-faint" style={{ fontSize: 10, letterSpacing: '0.04em' }}>
          —28 J
        </span>
      </div>

      <h3 className="serif" style={{ fontSize: 16, lineHeight: 1.35, marginBottom: 14, fontWeight: 400, textWrap: 'pretty' }}>
        À la même phase il y a un mois, tu avais noté :
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <EchoRow tone="helpful" label="A aidé" item={echo.helpful[0]} />
        {echo.notHelpful[0] && <EchoRow tone="avoid" label="N’a pas aidé" item={echo.notHelpful[0]} />}
      </div>

      <button className="hd-btn hd-btn-text" style={{ padding: '10px 0 0', fontSize: 12 }}>
        Voir tous les échos →
      </button>
    </div>
  );
}

function EchoRow({ tone, label, item }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span
        className="mono"
        style={{
          fontSize: 9,
          letterSpacing: '0.08em',
          color: tone === 'helpful' ? 'var(--green)' : 'var(--accent)',
          textTransform: 'uppercase',
          minWidth: 76,
          paddingTop: 4,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink-soft)' }}>{item}</span>
    </div>
  );
}

function JournalQuick({ value, onChange }) {
  const v = value || { pastilles: [], freeText: '', helpful: '', notHelpful: '' };
  const togglePastille = (id) => {
    const has = v.pastilles.includes(id);
    onChange({ ...v, pastilles: has ? v.pastilles.filter((x) => x !== id) : [...v.pastilles, id] });
  };
  return (
    <div className="hd-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span className="caps ink-mute">Ton observation du jour</span>
        <span className="mono ink-faint" style={{ fontSize: 10, letterSpacing: '0.04em' }}>10–30 s</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {PASTILLES.map((p) => (
          <button
            key={p.id}
            className="hd-pastille"
            data-selected={v.pastilles.includes(p.id)}
            onClick={() => togglePastille(p.id)}
          >
            <span className="hd-pastille-glyph">{p.glyph}</span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      <textarea
        className="hd-textarea"
        rows={2}
        placeholder="Un mot de ta journée avec elle (facultatif)"
        value={v.freeText}
        onChange={(e) => onChange({ ...v, freeText: e.target.value })}
      ></textarea>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
        <div>
          <label className="caps" style={{ color: 'var(--green)', display: 'block', marginBottom: 4 }}>
            A aidé
          </label>
          <input
            className="hd-input"
            placeholder="ex. soirée calme"
            value={v.helpful}
            onChange={(e) => onChange({ ...v, helpful: e.target.value })}
          />
        </div>
        <div>
          <label className="caps" style={{ color: 'var(--accent)', display: 'block', marginBottom: 4 }}>
            N’a pas aidé
          </label>
          <input
            className="hd-input"
            placeholder="ex. argumenter"
            value={v.notHelpful}
            onChange={(e) => onChange({ ...v, notHelpful: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

function GoFurther({ phase }) {
  return (
    <div style={{ background: 'var(--paper-warm)', borderRadius: 14, padding: '4px 18px 8px' }}>
      <Accordion title="Ce que tu peux observer">
        <ul className="hd-list-tight">
          {phase.observable.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </Accordion>
      <Accordion title="Ce que tu peux proposer">
        <ul className="hd-list-tight">
          {phase.propose.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </Accordion>
      <Accordion title="Il vaut mieux éviter">
        <ul className="hd-list-tight">
          {phase.avoid.map((x, i) => (
            <li key={i} data-tone="avoid">
              {x}
            </li>
          ))}
        </ul>
      </Accordion>
    </div>
  );
}

function HomeScreen({ phase, currentDay, journal, setJournal, onNavigate, onOverride }) {
  return (
    <div className="hd-screen hd-scroll">
      <StatusBar />
      <Topbar
        right={
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-mute)', letterSpacing: '0.04em' }}>
            JEU 28 MAI
          </span>
        }
      />

      <div style={{ padding: '4px 22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <PhaseCard phase={phase} currentDay={currentDay} onOverride={onOverride} />

        <div style={{ background: 'var(--paper-warm)', borderRadius: 14, padding: '14px 8px 8px' }}>
          <HormoneGraph currentDay={currentDay} height={190} />
        </div>

        <EchoCard phase={phase} />
        <JournalQuick value={journal} onChange={setJournal} />
        <GoFurther phase={phase} />

        <div style={{ height: 8 }}></div>
      </div>

      <NavBar current="home" onNavigate={onNavigate} />
    </div>
  );
}

Object.assign(window, { HomeScreen, PhaseCard, EchoCard, JournalQuick, GoFurther });
