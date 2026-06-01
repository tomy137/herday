// prototype.jsx — interactive prototype that wires together all screens.

function Prototype({ initialPhaseId = 'pre-menstruelle', startAt = 'home' }) {
  const [screen, setScreen] = React.useState(startAt);
  const [phaseId, setPhaseId] = React.useState(initialPhaseId);
  const [overrideOpen, setOverrideOpen] = React.useState(false);
  const [journal, setJournal] = React.useState({
    pastilles: ['fatigue', 'tendresse'],
    freeText: '',
    helpful: '',
    notHelpful: '',
  });

  const phase = PHASE_BY_ID[phaseId];
  // Pick a representative current day per phase for the graph
  const phaseDayMap = {
    'menstruation': 3,
    'post-menstruelle': 8,
    'pre-ovulatoire': 12,
    'ovulation': 15,
    'post-ovulatoire': 20,
    'pre-menstruelle': 25,
  };
  const currentDay = phaseDayMap[phaseId];

  const nav = (s) => setScreen(s);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: 'var(--paper)' }}>
      {screen === 'onboarding' && (
        <Onboarding onComplete={() => setScreen('home')} />
      )}
      {screen === 'home' && (
        <HomeScreen
          phase={phase}
          currentDay={currentDay}
          journal={journal}
          setJournal={setJournal}
          onNavigate={nav}
          onOverride={() => setOverrideOpen(true)}
        />
      )}
      {screen === 'journal' && (
        <JournalScreen
          phase={phase}
          journal={journal}
          setJournal={setJournal}
          onNavigate={nav}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'echoes' && (
        <EchoesScreen phase={phase} onNavigate={nav} />
      )}
      {screen === 'calendar' && (
        <CalendarScreen phase={phase} currentDay={currentDay} onNavigate={nav} />
      )}
      {screen === 'settings' && (
        <SettingsScreen onNavigate={nav} />
      )}

      {overrideOpen && (
        <OverrideSheet
          currentPhase={phase}
          onPick={(id) => { setPhaseId(id); setOverrideOpen(false); }}
          onClose={() => setOverrideOpen(false)}
        />
      )}
    </div>
  );
}

Object.assign(window, { Prototype });
