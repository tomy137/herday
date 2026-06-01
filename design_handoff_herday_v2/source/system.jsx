// system.jsx — Design tokens, base primitives, icons.

const TOKENS = {
  // Warm cream paper, V1-flavoured — bumped saturation so the surface
  // reads as "paper" rather than "white" against the canvas frame.
  paper: '#f7ecd0',
  paperWarm: '#efe1be',
  paperDeep: '#e6d4a8',
  ink: '#2b2618',
  inkSoft: '#46402f',
  inkMute: '#7a715c',
  inkFaint: '#a8a08c',
  rule: '#d8c79c',
  ruleSoft: '#e3d3ab',
  accent: '#a25a3c', // muted terracotta — used sparingly
  accentSoft: '#e8d8cd',
  green: '#5e7a5a',
  fSerif: '"Newsreader", "Source Serif Pro", Georgia, serif',
  fSans: '"Mulish", -apple-system, "Helvetica Neue", sans-serif',
  fMono: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace',
};

// Inject base CSS once
(function injectBaseCSS() {
  if (document.getElementById('herday-base-css')) return;
  const css = `
    :root {
      --paper: ${TOKENS.paper};
      --paper-warm: ${TOKENS.paperWarm};
      --paper-deep: ${TOKENS.paperDeep};
      --ink: ${TOKENS.ink};
      --ink-soft: ${TOKENS.inkSoft};
      --ink-mute: ${TOKENS.inkMute};
      --ink-faint: ${TOKENS.inkFaint};
      --rule: ${TOKENS.rule};
      --rule-soft: ${TOKENS.ruleSoft};
      --accent: ${TOKENS.accent};
      --accent-soft: ${TOKENS.accentSoft};
      --green: ${TOKENS.green};
      --f-serif: ${TOKENS.fSerif};
      --f-sans: ${TOKENS.fSans};
      --f-mono: ${TOKENS.fMono};
    }
    .hd, .hd * { box-sizing: border-box; }
    .hd {
      font-family: var(--f-sans);
      color: var(--ink);
      background: var(--paper);
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
      font-feature-settings: "ss01";
    }
    .hd button { font-family: inherit; cursor: pointer; }
    .hd p { margin: 0; }
    .hd h1, .hd h2, .hd h3, .hd h4 { margin: 0; font-weight: 600; }
    .hd .serif { font-family: var(--f-serif); }
    .hd .serif-i { font-family: var(--f-serif); font-style: italic; font-weight: 400; }
    .hd .mono { font-family: var(--f-mono); }
    .hd .ink-mute { color: var(--ink-mute); }
    .hd .ink-faint { color: var(--ink-faint); }
    .hd .caps {
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 11px;
      font-weight: 500;
    }
    .hd-screen {
      width: 100%;
      min-height: 100%;
      background: var(--paper);
      position: relative;
    }
    .hd-scroll {
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: none;
    }
    .hd-scroll::-webkit-scrollbar { display: none; }
    /* topbar */
    .hd-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 22px 12px;
    }
    .hd-wordmark {
      font-family: var(--f-serif);
      font-size: 19px;
      font-weight: 500;
      letter-spacing: -0.01em;
      color: var(--ink);
    }
    .hd-wordmark sup {
      font-family: var(--f-mono);
      font-size: 9px;
      color: var(--ink-mute);
      margin-left: 3px;
      vertical-align: super;
      letter-spacing: 0.04em;
    }
    /* nav */
    .hd-nav {
      position: sticky;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(251, 246, 234, 0.94);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-top: 0.5px solid var(--rule);
      padding: 10px 12px 24px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 4px;
    }
    .hd-navbtn {
      appearance: none;
      background: transparent;
      border: 0;
      padding: 8px 6px 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      color: var(--ink-mute);
      font-family: var(--f-sans);
      font-size: 10px;
      letter-spacing: 0.04em;
      border-radius: 8px;
      transition: color 0.15s;
    }
    .hd-navbtn[data-active="true"] {
      color: var(--ink);
    }
    .hd-navbtn[data-active="true"] .hd-navdot {
      background: var(--ink);
    }
    .hd-navdot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: transparent;
      margin-top: 2px;
    }
    /* card */
    .hd-card {
      background: var(--paper);
      border: 0.5px solid var(--rule);
      border-radius: 14px;
      padding: 18px;
    }
    .hd-card-flat {
      background: var(--paper-warm);
      border-radius: 14px;
      padding: 18px;
    }
    /* pastille */
    .hd-pastille {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 7px 11px 7px 9px;
      border-radius: 999px;
      border: 0.5px solid var(--rule);
      background: var(--paper);
      font-size: 13px;
      color: var(--ink);
      transition: all 0.15s;
      cursor: pointer;
      font-family: var(--f-sans);
    }
    .hd-pastille[data-selected="true"] {
      background: var(--ink);
      color: var(--paper);
      border-color: var(--ink);
    }
    .hd-pastille-glyph {
      font-family: var(--f-serif);
      font-size: 14px;
      line-height: 1;
      width: 14px;
      text-align: center;
      display: inline-block;
    }
    /* button */
    .hd-btn {
      appearance: none;
      border: 0;
      background: var(--ink);
      color: var(--paper);
      font-family: var(--f-sans);
      font-size: 14px;
      font-weight: 500;
      padding: 14px 20px;
      border-radius: 10px;
      letter-spacing: 0.01em;
      transition: background 0.15s, transform 0.05s;
    }
    .hd-btn:hover { background: var(--ink-soft); }
    .hd-btn:active { transform: scale(0.99); }
    .hd-btn-ghost {
      background: transparent;
      color: var(--ink);
      border: 0.5px solid var(--rule);
    }
    .hd-btn-ghost:hover { background: var(--paper-warm); }
    .hd-btn-text {
      background: transparent;
      color: var(--ink-mute);
      padding: 10px 14px;
      font-size: 13px;
    }
    .hd-btn-text:hover { color: var(--ink); background: var(--paper-warm); }
    /* tag */
    .hd-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: var(--f-mono);
      font-size: 10px;
      letter-spacing: 0.04em;
      color: var(--ink-mute);
      text-transform: uppercase;
    }
    .hd-tag-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    /* input */
    .hd-input {
      width: 100%;
      appearance: none;
      border: 0;
      border-bottom: 0.5px solid var(--rule);
      background: transparent;
      padding: 10px 0;
      font-family: var(--f-sans);
      font-size: 15px;
      color: var(--ink);
      outline: none;
      transition: border-color 0.15s;
    }
    .hd-input:focus { border-color: var(--ink); }
    .hd-textarea {
      width: 100%;
      appearance: none;
      border: 0.5px solid var(--rule);
      background: var(--paper-warm);
      border-radius: 10px;
      padding: 12px 14px;
      font-family: var(--f-sans);
      font-size: 14px;
      line-height: 1.5;
      color: var(--ink);
      outline: none;
      resize: none;
      transition: border-color 0.15s, background 0.15s;
    }
    .hd-textarea:focus { border-color: var(--ink); background: var(--paper); }
    /* divider */
    .hd-rule { height: 0.5px; background: var(--rule); width: 100%; }
    .hd-rule-soft { height: 0.5px; background: var(--rule-soft); width: 100%; }
    /* posture block — central design moment */
    .hd-posture-rail {
      display: flex;
      align-items: baseline;
      gap: 10px;
      flex-wrap: wrap;
    }
    .hd-posture-word {
      font-family: var(--f-serif);
      font-size: 28px;
      font-weight: 400;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: var(--ink);
      line-height: 1.05;
    }
    .hd-posture-sep {
      color: var(--ink-faint);
      font-size: 16px;
    }
    /* status bar (just a sliver) */
    .hd-statusbar {
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 22px;
      font-family: var(--f-mono);
      font-size: 10px;
      color: var(--ink-soft);
      letter-spacing: 0.04em;
    }
    /* confidence pip */
    .hd-confidence {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: var(--f-mono);
      font-size: 10px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--ink-mute);
    }
    .hd-confbar {
      display: inline-flex;
      gap: 2px;
    }
    .hd-confbar i {
      width: 4px;
      height: 8px;
      background: var(--ink-faint);
      border-radius: 1px;
      display: inline-block;
    }
    .hd-confbar i[data-on="true"] {
      background: var(--ink);
    }
    /* phase swatch */
    .hd-swatch {
      width: 10px;
      height: 10px;
      border-radius: 2px;
      display: inline-block;
    }
    /* accordion */
    .hd-acc {
      border-top: 0.5px solid var(--rule);
      padding: 14px 0;
    }
    .hd-acc-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      user-select: none;
    }
    .hd-acc-title {
      font-family: var(--f-serif);
      font-size: 15px;
      color: var(--ink);
      font-weight: 400;
    }
    .hd-acc-chev {
      font-family: var(--f-mono);
      font-size: 10px;
      color: var(--ink-mute);
      transition: transform 0.2s;
    }
    .hd-acc[data-open="true"] .hd-acc-chev { transform: rotate(90deg); }
    .hd-acc-body {
      padding-top: 14px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    /* posture inline grouping */
    .hd-list-tight { display: flex; flex-direction: column; gap: 8px; }
    .hd-list-tight li {
      list-style: none;
      padding-left: 16px;
      position: relative;
      font-size: 13.5px;
      line-height: 1.5;
      color: var(--ink-soft);
    }
    .hd-list-tight li::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0.65em;
      width: 6px;
      height: 0.5px;
      background: var(--ink-faint);
    }
    .hd-list-tight li[data-tone="avoid"] { color: var(--ink-soft); }
    .hd-list-tight li[data-tone="avoid"]::before { background: var(--accent); }
  `;
  const style = document.createElement('style');
  style.id = 'herday-base-css';
  style.textContent = css;
  document.head.appendChild(style);
})();

// ─── primitives ───────────────────────────────────────────────────────

function Confidence({ level = 'élevée', value = 4 }) {
  // value 0-5
  return (
    <span className="hd-confidence">
      <span>Confiance · {level}</span>
      <span className="hd-confbar">
        {[0, 1, 2, 3, 4].map((i) => (
          <i key={i} data-on={i < value ? 'true' : 'false'}></i>
        ))}
      </span>
    </span>
  );
}

function PhaseTag({ phase, suffix }) {
  return (
    <span className="hd-tag">
      <span className="hd-swatch" style={{ background: phase.color }}></span>
      <span>{phase.short}{suffix ? ` · ${suffix}` : ''}</span>
    </span>
  );
}

function NavBar({ current, onNavigate }) {
  const Icon = ({ id }) => {
    const stroke = 'currentColor';
    const sw = 1.4;
    if (id === 'home')
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        </svg>
      );
    if (id === 'calendar')
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="5" width="16" height="15" rx="2" stroke={stroke} strokeWidth={sw} />
          <path d="M4 10h16M9 3v4M15 3v4" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    if (id === 'echoes')
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M20 4v4h-4" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke={stroke} strokeWidth={sw} />
        <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </svg>
    );
  };
  const items = [
    { id: 'home', label: 'Aujourd’hui' },
    { id: 'calendar', label: 'Calendrier' },
    { id: 'echoes', label: 'Échos' },
    { id: 'settings', label: 'Réglages' },
  ];
  return (
    <nav className="hd-nav">
      {items.map((it) => (
        <button
          key={it.id}
          className="hd-navbtn"
          data-active={current === it.id}
          onClick={() => onNavigate(it.id)}
        >
          <Icon id={it.id} />
          <span>{it.label}</span>
          <span className="hd-navdot"></span>
        </button>
      ))}
    </nav>
  );
}

function StatusBar() {
  return (
    <div className="hd-statusbar">
      <span>9:41</span>
      <span>· · ·</span>
    </div>
  );
}

function Topbar({ onMenu, right }) {
  return (
    <div className="hd-topbar">
      <div className="hd-wordmark">
        HerDay<sup>V2</sup>
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>{right}</div>
    </div>
  );
}

function PostureRail({ words }) {
  return (
    <div className="hd-posture-rail">
      {words.map((w, i) => (
        <React.Fragment key={i}>
          <span className="hd-posture-word">{w}</span>
          {i < words.length - 1 && <span className="hd-posture-sep">·</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

function Accordion({ title, defaultOpen = false, children }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="hd-acc" data-open={open}>
      <div className="hd-acc-head" onClick={() => setOpen(!open)}>
        <span className="hd-acc-title">{title}</span>
        <span className="hd-acc-chev">›</span>
      </div>
      {open && <div className="hd-acc-body">{children}</div>}
    </div>
  );
}

Object.assign(window, {
  TOKENS,
  Confidence,
  PhaseTag,
  NavBar,
  StatusBar,
  Topbar,
  PostureRail,
  Accordion,
});
