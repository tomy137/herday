// app.jsx — Top-level: design canvas with multiple artboards + Tweaks.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "phase": "pre-menstruelle"
}/*EDITMODE-END*/;

const MW = 390;   // mobile artboard width
const MH = 844;   // mobile artboard height
const ONB_H = 760; // onboarding screens (no nav, shorter)

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Per-phase default journal so the home variants look populated
  const journalFor = (phaseId) => {
    const presets = {
      'menstruation': { pastilles: ['fatigue', 'douleur', 'tendresse'], freeText: '', helpful: '', notHelpful: '' },
      'post-menstruelle': { pastilles: ['bon-moment', 'energie'], freeText: '', helpful: '', notHelpful: '' },
      'pre-ovulatoire': { pastilles: ['energie', 'bon-moment', 'rires'], freeText: '', helpful: '', notHelpful: '' },
      'ovulation': { pastilles: ['coquin', 'rires', 'tendresse'], freeText: '', helpful: '', notHelpful: '' },
      'post-ovulatoire': { pastilles: ['energie', 'pulsion'], freeText: '', helpful: '', notHelpful: '' },
      'pre-menstruelle': { pastilles: ['fatigue', 'repli'], freeText: '', helpful: '', notHelpful: '' },
    };
    return presets[phaseId];
  };

  return (
    <div className="hd">
      <DesignCanvas>
        {/* ─── PROTOTYPE INTERACTIF ───────────────────────────────── */}
        <DCSection
          id="proto"
          title="Prototype interactif"
          subtitle="Navigue, ouvre la feuille « je l’observe différemment », saisis ton journal. Le panneau Tweaks (en bas à droite, à activer) permet de cycler entre les six sous-phases pour voir la page Home dans chaque état."
        >
          <DCArtboard id="proto-main" label="Prototype · état courant" width={MW} height={MH}>
            <Prototype
              key={`proto-${t.phase}`}
              initialPhaseId={t.phase}
              startAt="home"
            />
          </DCArtboard>
        </DCSection>

        {/* ─── ONBOARDING ─────────────────────────────────────────── */}
        <DCSection
          id="onboarding"
          title="Onboarding"
          subtitle="Quatre écrans. Connexion, pacte de transparence, six sous-phases, première saisie."
        >
          <DCArtboard id="onb-1" label="01 · Connexion" width={MW} height={ONB_H}>
            <OnbConnexion step={0} total={4} onNext={() => {}} />
          </DCArtboard>
          <DCArtboard id="onb-2" label="02 · Pacte de transparence" width={MW} height={ONB_H}>
            <OnbPacte step={1} total={4} onNext={() => {}} onBack={() => {}} />
          </DCArtboard>
          <DCArtboard id="onb-3" label="03 · Cycle et hormones" width={MW} height={ONB_H + 120}>
            <OnbCycle step={2} total={4} onNext={() => {}} onBack={() => {}} />
          </DCArtboard>
          <DCArtboard id="onb-4" label="04 · Première saisie" width={MW} height={ONB_H}>
            <OnbFirstEntry step={3} total={4} onNext={() => {}} onBack={() => {}} />
          </DCArtboard>
        </DCSection>

        {/* ─── HOME — VARIATIONS PAR PHASE ────────────────────────── */}
        <DCSection
          id="home-variations"
          title="Home — variations par sous-phase"
          subtitle="Six états de la home. Mêmes composants, postures et tons décalés. Le graphique hormonal et les pastilles du journal reflètent la phase courante."
        >
          {PHASES.map((p) => {
            const day = { 'menstruation': 3, 'post-menstruelle': 8, 'pre-ovulatoire': 12, 'ovulation': 15, 'post-ovulatoire': 20, 'pre-menstruelle': 25 }[p.id];
            return (
              <DCArtboard
                key={p.id}
                id={`home-${p.id}`}
                label={p.name}
                width={MW}
                height={1680}
              >
                <HomeScreen
                  phase={p}
                  currentDay={day}
                  journal={journalFor(p.id)}
                  setJournal={() => {}}
                  onNavigate={() => {}}
                  onOverride={() => {}}
                />
              </DCArtboard>
            );
          })}
        </DCSection>

        {/* ─── JOURNAL · ÉCHOS · CALENDRIER · RÉGLAGES ───────────── */}
        <DCSection
          id="other-screens"
          title="Journal · Échos · Calendrier · Réglages"
          subtitle="Les quatre piliers à côté de la home."
        >
          <DCArtboard id="journal-full" label="Journal d’observation" width={MW} height={1320}>
            <JournalScreen
              phase={PHASE_BY_ID['pre-menstruelle']}
              journal={{ pastilles: ['fatigue', 'repli', 'tendresse'], freeText: 'Soir un peu tendu après le retour du boulot. Elle a peu mangé, est partie se coucher tôt. Je n’ai pas relancé sur le week-end.', helpful: "J'ai annulé le dîner avec Marc — elle a soufflé en l'apprenant.", notHelpful: '' }}
              setJournal={() => {}}
              onNavigate={() => {}}
              onBack={() => {}}
            />
          </DCArtboard>
          <DCArtboard id="echoes-full" label="Échos — phase pré-menstruelle" width={MW} height={1320}>
            <EchoesScreen phase={PHASE_BY_ID['pre-menstruelle']} onNavigate={() => {}} />
          </DCArtboard>
          <DCArtboard id="calendar-full" label="Calendrier · mai" width={MW} height={MH + 100}>
            <CalendarScreen phase={PHASE_BY_ID['pre-menstruelle']} currentDay={24} onNavigate={() => {}} />
          </DCArtboard>
          <DCArtboard id="settings-full" label="Réglages · pacte de transparence" width={MW} height={1500}>
            <SettingsScreen onNavigate={() => {}} />
          </DCArtboard>
        </DCSection>

        {/* ─── OVERRIDE SHEET ─────────────────────────────────────── */}
        <DCSection
          id="override"
          title="« Je l’observe différemment »"
          subtitle="La feuille omniprésente sur la home. Vocabulaire hypothétique, choix journalisé."
        >
          <DCArtboard id="override-sheet" label="Feuille de correction" width={MW} height={MH}>
            <div style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--paper)', overflow: 'hidden' }}>
              <HomeScreen
                phase={PHASE_BY_ID['pre-menstruelle']}
                currentDay={25}
                journal={{ pastilles: ['fatigue', 'repli'], freeText: '', helpful: '', notHelpful: '' }}
                setJournal={() => {}}
                onNavigate={() => {}}
                onOverride={() => {}}
              />
              <OverrideSheet
                currentPhase={PHASE_BY_ID['pre-menstruelle']}
                onPick={() => {}}
                onClose={() => {}}
              />
            </div>
          </DCArtboard>
        </DCSection>

        {/* ─── WIDGETS iOS ────────────────────────────────────────── */}
        <DCSection
          id="widgets"
          title="Widgets iOS"
          subtitle="Disponibilité passive sur l’écran d’accueil et de verrouillage. La posture du jour en un coup d’œil ; aucune notification, aucun rappel intrusif. La phase rendue ici suit le réglage Tweaks."
        >
          <DCArtboard id="w-lock" label="Lock screen · in situ" width={300} height={620}>
            <LockScreenMock phase={PHASE_BY_ID[t.phase]} day={{ 'menstruation':3,'post-menstruelle':8,'pre-ovulatoire':12,'ovulation':15,'post-ovulatoire':20,'pre-menstruelle':25 }[t.phase]} />
          </DCArtboard>

          <DCArtboard id="w-home" label="Home screen · in situ" width={300} height={620}>
            <HomeScreenMock phase={PHASE_BY_ID[t.phase]} day={{ 'menstruation':3,'post-menstruelle':8,'pre-ovulatoire':12,'ovulation':15,'post-ovulatoire':20,'pre-menstruelle':25 }[t.phase]} />
          </DCArtboard>

          <DCArtboard id="w-small-posture" label="Small · posture" width={210} height={210}>
            <WidgetCanvasFrame>
              <WidgetSmallPosture phase={PHASE_BY_ID[t.phase]} day={{ 'menstruation':3,'post-menstruelle':8,'pre-ovulatoire':12,'ovulation':15,'post-ovulatoire':20,'pre-menstruelle':25 }[t.phase]} />
            </WidgetCanvasFrame>
          </DCArtboard>

          <DCArtboard id="w-small-day" label="Small · jour du cycle" width={210} height={210}>
            <WidgetCanvasFrame>
              <WidgetSmallDay phase={PHASE_BY_ID[t.phase]} day={{ 'menstruation':3,'post-menstruelle':8,'pre-ovulatoire':12,'ovulation':15,'post-ovulatoire':20,'pre-menstruelle':25 }[t.phase]} />
            </WidgetCanvasFrame>
          </DCArtboard>

          <DCArtboard id="w-medium" label="Medium · aujourd’hui" width={390} height={210}>
            <WidgetCanvasFrame>
              <WidgetMedium phase={PHASE_BY_ID[t.phase]} day={{ 'menstruation':3,'post-menstruelle':8,'pre-ovulatoire':12,'ovulation':15,'post-ovulatoire':20,'pre-menstruelle':25 }[t.phase]} />
            </WidgetCanvasFrame>
          </DCArtboard>

          <DCArtboard id="w-large" label="Large · tableau complet" width={390} height={410}>
            <WidgetCanvasFrame>
              <WidgetLarge phase={PHASE_BY_ID[t.phase]} day={{ 'menstruation':3,'post-menstruelle':8,'pre-ovulatoire':12,'ovulation':15,'post-ovulatoire':20,'pre-menstruelle':25 }[t.phase]} />
            </WidgetCanvasFrame>
          </DCArtboard>

          <DCArtboard id="w-lock-pieces" label="Lock screen · variantes" width={260} height={260}>
            <div style={{ width: '100%', height: '100%', background: 'radial-gradient(120% 80% at 30% 20%, #2a2820 0%, #14130f 70%)', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <LockInline phase={PHASE_BY_ID[t.phase]} day={{ 'menstruation':3,'post-menstruelle':8,'pre-ovulatoire':12,'ovulation':15,'post-ovulatoire':20,'pre-menstruelle':25 }[t.phase]} />
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <LockCircular phase={PHASE_BY_ID[t.phase]} day={{ 'menstruation':3,'post-menstruelle':8,'pre-ovulatoire':12,'ovulation':15,'post-ovulatoire':20,'pre-menstruelle':25 }[t.phase]} />
                <LockRectangular phase={PHASE_BY_ID[t.phase]} day={{ 'menstruation':3,'post-menstruelle':8,'pre-ovulatoire':12,'ovulation':15,'post-ovulatoire':20,'pre-menstruelle':25 }[t.phase]} />
              </div>
            </div>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      {/* Tweaks */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="État du prototype" />
        <TweakSelect
          label="Sous-phase"
          value={t.phase}
          options={PHASES.map((p) => ({ value: p.id, label: p.short }))}
          onChange={(v) => setTweak('phase', v)}
        />
        <TweakSection label="Légende" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '2px 0' }}>
          {PHASES.map((p) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: p.color }}></span>
              <span style={{ color: 'rgba(41,38,27,0.85)' }}>{p.short}</span>
            </div>
          ))}
        </div>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
