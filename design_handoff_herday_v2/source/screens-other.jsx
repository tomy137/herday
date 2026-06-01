// screens-other.jsx — Journal detail, Échos, Calendar, Settings, Override sheet.

// ─── Journal (full screen, not the inline home one) ─────────────────

function JournalScreen({ phase, journal, setJournal, onNavigate, onBack }) {
  return (
    <div className="hd-screen hd-scroll">
      <StatusBar />
      <div style={{ padding: '14px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="hd-btn hd-btn-text" onClick={onBack} style={{ marginLeft: -8 }}>
          ←
        </button>
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-mute)', letterSpacing: '0.04em' }}>
          ENTRÉE · JEU 28 MAI · J{24}
        </span>
        <button className="hd-btn hd-btn-text" style={{ fontSize: 12 }}>
          Enregistrer
        </button>
      </div>

      <div style={{ padding: '20px 22px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <div className="caps ink-faint" style={{ marginBottom: 10 }}>
            Carnet
          </div>
          <h1
            className="serif"
            style={{ fontSize: 28, fontWeight: 400, lineHeight: 1.2, letterSpacing: '-0.01em' }}
          >
            Ton observation pour aujourd’hui.
          </h1>
          <p style={{ marginTop: 10, fontSize: 13.5, color: 'var(--ink-mute)', lineHeight: 1.5 }}>
            Note ce que <em>tu</em> as observé. Pas ce qu’elle ressent — tu ne sais pas. Pas de jugement.
          </p>
        </div>

        <div>
          <div className="caps ink-mute" style={{ marginBottom: 10 }}>Moments forts</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PASTILLES.map((p) => (
              <button
                key={p.id}
                className="hd-pastille"
                data-selected={journal.pastilles.includes(p.id)}
                onClick={() => {
                  const has = journal.pastilles.includes(p.id);
                  setJournal({
                    ...journal,
                    pastilles: has ? journal.pastilles.filter((x) => x !== p.id) : [...journal.pastilles, p.id],
                  });
                }}
              >
                <span className="hd-pastille-glyph">{p.glyph}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="caps ink-mute" style={{ marginBottom: 10 }}>Texte libre</div>
          <textarea
            className="hd-textarea"
            rows={6}
            placeholder="Ce que tu observes, en tes mots. Personne d’autre que toi ne le lira."
            value={journal.freeText}
            onChange={(e) => setJournal({ ...journal, freeText: e.target.value })}
          ></textarea>
        </div>

        <div>
          <div className="caps ink-mute" style={{ marginBottom: 10 }}>La boucle d’apprentissage</div>
          <p style={{ fontSize: 12.5, color: 'var(--ink-mute)', lineHeight: 1.5, marginBottom: 14 }}>
            Carburant de la mémoire inter-cycles. À ne pas zapper.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="caps" style={{ color: 'var(--green)', display: 'block', marginBottom: 6 }}>
                Ce qui a aidé aujourd’hui
              </label>
              <textarea
                className="hd-textarea"
                rows={2}
                placeholder="Ex. j’ai annulé le dîner pour qu’on soit tranquilles"
                value={journal.helpful}
                onChange={(e) => setJournal({ ...journal, helpful: e.target.value })}
              ></textarea>
            </div>
            <div>
              <label className="caps" style={{ color: 'var(--accent)', display: 'block', marginBottom: 6 }}>
                Ce qui n’a pas aidé
              </label>
              <textarea
                className="hd-textarea"
                rows={2}
                placeholder="Ex. j’ai argumenté sur la to-do du week-end"
                value={journal.notHelpful}
                onChange={(e) => setJournal({ ...journal, notHelpful: e.target.value })}
              ></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Échos ───────────────────────────────────────────────────────────

function EchoesScreen({ phase, onNavigate }) {
  const echo = ECHO_SAMPLES[phase.id];
  const samePhaseHistory = [
    { date: 'Avril', dayrange: 'J22–J28', note: echo?.note },
    { date: 'Mars', dayrange: 'J21–J27', note: 'Cycle court, signal moins net.' },
    { date: 'Février', dayrange: 'J23–J28', note: 'Premier cycle où j’avais bien noté.' },
  ];
  return (
    <div className="hd-screen hd-scroll">
      <StatusBar />
      <Topbar
        right={
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-mute)', letterSpacing: '0.04em' }}>
            ÉCHOS
          </span>
        }
      />

      <div style={{ padding: '8px 22px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <div className="caps ink-faint" style={{ marginBottom: 8 }}>
            Mémoire inter-cycles
          </div>
          <h1 className="serif" style={{ fontSize: 26, fontWeight: 400, lineHeight: 1.18, letterSpacing: '-0.01em' }}>
            Comment tu l’as vue, à la phase {phase.short.toLowerCase()}, lors des derniers cycles.
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PHASES.map((p) => (
            <button
              key={p.id}
              className="hd-pastille"
              data-selected={p.id === phase.id}
            >
              <span className="hd-swatch" style={{ background: p.color, width: 8, height: 8 }}></span>
              <span style={{ fontSize: 12 }}>{p.short}</span>
            </button>
          ))}
        </div>

        {/* Frequent moments */}
        <div className="hd-card">
          <div className="caps ink-mute" style={{ marginBottom: 12 }}>
            Moments fréquents à cette phase
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(echo?.frequent || []).map((id) => {
              const p = PASTILLES.find((x) => x.id === id);
              if (!p) return null;
              const freq = 3 - (echo.frequent.indexOf(id));
              return (
                <FrequencyRow key={id} pastille={p} count={freq} total={3} />
              );
            })}
          </div>
        </div>

        {/* Helpful / not helpful aggregated */}
        <div className="hd-card">
          <div className="caps ink-mute" style={{ marginBottom: 12 }}>
            La boucle d’apprentissage
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {echo?.helpful.map((h, i) => (
              <EchoRow key={'h' + i} tone="helpful" label="A aidé" item={h} />
            ))}
            {echo?.notHelpful.map((h, i) => (
              <EchoRow key={'n' + i} tone="avoid" label="N’a pas aidé" item={h} />
            ))}
          </div>
        </div>

        {/* Note extracts */}
        <div className="hd-card">
          <div className="caps ink-mute" style={{ marginBottom: 12 }}>
            Extraits de tes notes
          </div>
          {samePhaseHistory.map((h, i) => (
            <div
              key={i}
              style={{
                paddingTop: i === 0 ? 0 : 12,
                paddingBottom: 12,
                borderBottom: i < samePhaseHistory.length - 1 ? '0.5px solid var(--rule)' : 'none',
              }}
            >
              <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-faint)', letterSpacing: '0.06em', marginBottom: 4 }}>
                {h.date.toUpperCase()} · {h.dayrange}
              </div>
              <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-soft)' }}>
                « {h.note} »
              </p>
            </div>
          ))}
        </div>

        <div className="hd-card-flat" style={{ background: 'var(--paper-warm)' }}>
          <div className="caps ink-mute" style={{ marginBottom: 8 }}>
            Posture que tu veux retenir
          </div>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-soft)', marginBottom: 12 }}>
            Ajoute un mot à toi, pour cette phase. Il rejoindra la rotation à chaque retour de phase.
          </p>
          <input className="hd-input" placeholder="ex. COURBE PROTECTRICE" />
        </div>
      </div>

      <NavBar current="echoes" onNavigate={onNavigate} />
    </div>
  );
}

function FrequencyRow({ pastille, count, total }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 110,
      }}>
        <span className="hd-pastille-glyph" style={{ color: 'var(--ink)' }}>{pastille.glyph}</span>
        <span style={{ fontSize: 13 }}>{pastille.label}</span>
      </span>
      <span style={{ flex: 1, display: 'flex', gap: 3 }}>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            style={{
              flex: 1,
              height: 8,
              borderRadius: 1,
              background: i < count ? 'var(--ink)' : 'var(--rule)',
            }}
          ></span>
        ))}
      </span>
      <span className="mono" style={{ fontSize: 10, color: 'var(--ink-mute)', minWidth: 26, textAlign: 'right' }}>
        {count}/3
      </span>
    </div>
  );
}

// ─── Calendar ────────────────────────────────────────────────────────

function CalendarScreen({ phase, currentDay, onNavigate, onSelectDay }) {
  // Generate a month grid. Use May 2026; cycle starts day 5 of the month.
  const monthName = 'Mai 2026';
  const firstWeekday = 4; // Friday — for May 1, 2026 (5/1 = Friday in real cal — close enough)
  const daysInMonth = 31;
  const cycleStartDom = 5; // The day-of-month her cycle began
  const cycleLen = 28;

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dayInCycle = ((d - cycleStartDom) % cycleLen + cycleLen) % cycleLen + 1;
    const cellPhase = phaseForDay(dayInCycle);
    cells.push({ d, dayInCycle, phase: cellPhase });
  }
  const todayDom = cycleStartDom + (currentDay - 1);

  return (
    <div className="hd-screen hd-scroll">
      <StatusBar />
      <Topbar
        right={
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-mute)', letterSpacing: '0.04em' }}>
            CALENDRIER
          </span>
        }
      />

      <div style={{ padding: '8px 22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="hd-btn hd-btn-text" style={{ padding: '6px 8px', marginLeft: -8 }}>‹</button>
          <h2 className="serif" style={{ fontSize: 20, fontWeight: 400 }}>{monthName}</h2>
          <button className="hd-btn hd-btn-text" style={{ padding: '6px 8px', marginRight: -8 }}>›</button>
        </div>

        {/* Weekday header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
            <div
              key={i}
              className="mono"
              style={{
                fontSize: 9,
                textAlign: 'center',
                color: 'var(--ink-faint)',
                letterSpacing: '0.06em',
                padding: '6px 0',
              }}
            >
              {d}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {cells.map((c, i) => {
            if (!c) return <div key={i} style={{ aspectRatio: '1/1.05' }}></div>;
            const isToday = c.d === todayDom;
            return (
              <button
                key={i}
                onClick={() => onSelectDay && onSelectDay(c)}
                style={{
                  appearance: 'none',
                  border: isToday ? '1px solid var(--ink)' : '0.5px solid transparent',
                  background: c.phase.colorSoft + (isToday ? 'ff' : '80'),
                  aspectRatio: '1/1.05',
                  borderRadius: 8,
                  padding: '6px 4px 4px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  fontFamily: 'var(--f-sans)',
                }}
              >
                <span style={{
                  fontSize: 13,
                  color: isToday ? 'var(--ink)' : c.phase.colorInk,
                  fontWeight: isToday ? 500 : 400,
                }}>
                  {c.d}
                </span>
                <span className="mono" style={{ fontSize: 8, color: c.phase.colorInk, opacity: 0.7, letterSpacing: '0.04em' }}>
                  J{c.dayInCycle}
                </span>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="hd-card-flat">
          <div className="caps ink-mute" style={{ marginBottom: 10 }}>Légende des phases</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {PHASES.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
                <span style={{ width: 12, height: 12, background: p.colorSoft, borderRadius: 2, display: 'inline-block', border: '0.5px solid ' + p.color + '40' }}></span>
                <span style={{ color: 'var(--ink-soft)' }}>{p.short}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cross-cycle filter — entry point to échos */}
        <button
          onClick={() => onNavigate('echoes')}
          className="hd-card"
          style={{ textAlign: 'left', border: '0.5px solid var(--rule)', cursor: 'pointer' }}
        >
          <div className="caps ink-mute" style={{ marginBottom: 6 }}>Filtre inter-cycles</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="serif" style={{ fontSize: 15.5 }}>
              Voir toutes les phases {phase.short.toLowerCase()} des 6 derniers mois
            </span>
            <span className="mono" style={{ color: 'var(--ink-mute)' }}>→</span>
          </div>
        </button>
      </div>

      <NavBar current="calendar" onNavigate={onNavigate} />
    </div>
  );
}

// ─── Settings (transparency tab) ─────────────────────────────────────

function SettingsScreen({ onNavigate, transparencyStatus = 'told_soon' }) {
  return (
    <div className="hd-screen hd-scroll">
      <StatusBar />
      <Topbar
        right={
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-mute)', letterSpacing: '0.04em' }}>
            RÉGLAGES
          </span>
        }
      />

      <div style={{ padding: '8px 22px 24px', display: 'flex', flexDirection: 'column', gap: 22 }}>
        <h1 className="serif" style={{ fontSize: 26, fontWeight: 400, lineHeight: 1.15 }}>
          Réglages
        </h1>

        {/* Section: Transparence (highlighted) */}
        <SettingsGroup
          title="Pacte de transparence"
          status="actif"
        >
          <div style={{ padding: '16px 18px', background: 'var(--paper-warm)', borderRadius: 12 }}>
            <div className="caps" style={{ color: 'var(--green)', marginBottom: 8 }}>
              ✓ Je lui en parlerai bientôt — accepté le 12 mai
            </div>
            <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-soft)' }}>
              Un outil d’observation utilisé en silence finit par remplacer la conversation au lieu de la nourrir. C’est l’inverse de ce qu’on veut ici.
            </p>
          </div>

          <SettingsRow label="Marquer comme : « je lui en ai déjà parlé »" hint="Statut journalisé" />
          <SettingsRow label="Phrases d’amorce pour lui en parler" hint="3 suggestions" />
          <SettingsRow label="Lui montrer mon carnet maintenant" hint="Passe l’app en mode lecture" />
        </SettingsGroup>

        <SettingsGroup title="Données d’elle">
          <SettingsRow label="Projet en cours (perçu)" value="Nouveau cabinet" />
          <SettingsRow label="Latitude (pour la saison)" value="48.86° N" />
          <SettingsRow label="Date des dernières règles" value="5 mai 2026" hint="Confiance · élevée" />
        </SettingsGroup>

        <SettingsGroup title="Carnet">
          <SettingsRow label="Exporter en CSV" hint="Toutes mes entrées" />
          <SettingsRow label="Exporter en PDF" hint="Mise en page lecture" />
          <SettingsRow label="Remettre à zéro mon carnet" tone="warn" />
          <SettingsRow label="J’ai mis fin à la relation" hint="Effacement complet ou archivage local" tone="warn" />
        </SettingsGroup>

        <SettingsGroup title="Affichage">
          <SettingsRow label="Langue" value="Français" />
          <SettingsRow label="Mode sombre" value="Auto" />
        </SettingsGroup>

        <SettingsGroup title="À propos">
          <SettingsRow label="Philosophie produit" />
          <SettingsRow label="Sources" hint="Kiffe ton cycle ! — G. Baldassari" />
          <SettingsRow label="Version" value="2.0.0-alpha" />
        </SettingsGroup>
      </div>

      <NavBar current="settings" onNavigate={onNavigate} />
    </div>
  );
}

function SettingsGroup({ title, status, children }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <span className="caps ink-mute">{title}</span>
        {status && (
          <span className="mono" style={{ fontSize: 10, color: 'var(--green)', letterSpacing: '0.04em' }}>
            ● {status}
          </span>
        )}
      </div>
      <div className="hd-card" style={{ padding: 0, overflow: 'hidden' }}>
        {React.Children.map(children, (c, i) => (
          <React.Fragment>
            {i > 0 && <div className="hd-rule-soft" style={{ background: 'var(--rule-soft)' }}></div>}
            {c}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function SettingsRow({ label, value, hint, tone }) {
  return (
    <button
      style={{
        appearance: 'none',
        background: 'transparent',
        border: 0,
        width: '100%',
        textAlign: 'left',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        cursor: 'pointer',
        fontFamily: 'var(--f-sans)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 14, color: tone === 'warn' ? 'var(--accent)' : 'var(--ink)' }}>{label}</span>
        {hint && (
          <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-faint)', letterSpacing: '0.04em' }}>
            {hint}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {value && (
          <span style={{ fontSize: 13, color: 'var(--ink-mute)' }}>{value}</span>
        )}
        <span className="mono" style={{ fontSize: 12, color: 'var(--ink-faint)' }}>›</span>
      </div>
    </button>
  );
}

// ─── Override sheet ───────────────────────────────────────────────────

function OverrideSheet({ currentPhase, onPick, onClose }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(31, 28, 24, 0.4)',
        display: 'flex',
        alignItems: 'flex-end',
        zIndex: 50,
        animation: 'hdFade .15s ease',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--paper)',
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          padding: '14px 22px 32px',
          width: '100%',
          animation: 'hdSheetIn .22s cubic-bezier(.2,.7,.3,1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <span style={{ width: 40, height: 4, background: 'var(--rule)', borderRadius: 2 }}></span>
        </div>
        <div className="caps ink-mute" style={{ marginBottom: 10 }}>
          Je l’observe différemment
        </div>
        <h3 className="serif" style={{ fontSize: 20, fontWeight: 400, lineHeight: 1.25, marginBottom: 6 }}>
          La prédiction est une hypothèse. Tu observes mieux qu’elle.
        </h3>
        <p style={{ fontSize: 13, color: 'var(--ink-mute)', lineHeight: 1.55, marginBottom: 18 }}>
          Ton choix est journalisé. La phase prédite reste visible en arrière-plan.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {PHASES.map((p) => (
            <button
              key={p.id}
              onClick={() => onPick(p.id)}
              style={{
                appearance: 'none',
                background: p.id === currentPhase.id ? 'var(--paper-warm)' : 'transparent',
                border: '0.5px solid ' + (p.id === currentPhase.id ? 'var(--ink)' : 'var(--rule)'),
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'var(--f-sans)',
              }}
            >
              <span className="hd-swatch" style={{ background: p.color, width: 12, height: 12 }}></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: 'var(--ink)' }}>{p.name}</div>
                <div className="mono" style={{ fontSize: 9.5, color: 'var(--ink-faint)', letterSpacing: '0.04em', marginTop: 2 }}>
                  {p.range}
                </div>
              </div>
              {p.id === currentPhase.id && (
                <span className="mono" style={{ fontSize: 9, color: 'var(--ink-mute)', letterSpacing: '0.04em' }}>
                  PRÉDIT
                </span>
              )}
            </button>
          ))}
        </div>

        <style>{`
          @keyframes hdSheetIn { from { transform: translateY(100%); } to { transform: translateY(0); } }
          @keyframes hdFade { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </div>
    </div>
  );
}

Object.assign(window, {
  JournalScreen,
  EchoesScreen,
  CalendarScreen,
  SettingsScreen,
  OverrideSheet,
});
