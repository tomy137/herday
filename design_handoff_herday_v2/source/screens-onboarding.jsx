// screens-onboarding.jsx — 5 onboarding screens.

function OnbStep({ index, total, title, eyebrow, children, cta, secondaryCta, onPrimary, onSecondary, onBack }) {
  return (
    <div className="hd-screen hd-scroll" style={{ display: 'flex', flexDirection: 'column' }}>
      <StatusBar />
      <div style={{ padding: '14px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {onBack ? (
          <button className="hd-btn hd-btn-text" style={{ padding: '6px 8px', marginLeft: -8 }} onClick={onBack}>
            ←
          </button>
        ) : (
          <span></span>
        )}
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '0.08em' }}>
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>

      <div style={{ flex: 1, padding: '40px 26px 24px', display: 'flex', flexDirection: 'column' }}>
        {eyebrow && (
          <div className="caps ink-faint" style={{ marginBottom: 18 }}>
            {eyebrow}
          </div>
        )}
        <h1
          className="serif"
          style={{ fontSize: 28, fontWeight: 400, lineHeight: 1.18, letterSpacing: '-0.01em', marginBottom: 24, textWrap: 'pretty' }}
        >
          {title}
        </h1>
        <div style={{ flex: 1 }}>{children}</div>
      </div>

      <div style={{ padding: '0 22px 28px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {secondaryCta && (
          <button className="hd-btn hd-btn-ghost" onClick={onSecondary}>
            {secondaryCta}
          </button>
        )}
        <button className="hd-btn" onClick={onPrimary}>
          {cta}
        </button>
      </div>
    </div>
  );
}

function OnbConnexion({ onNext, step, total }) {
  const [email, setEmail] = React.useState('');
  return (
    <OnbStep
      index={step}
      total={total}
      eyebrow="Bienvenue"
      title={
        <>
          Ton carnet. Pas le sien.
        </>
      }
      cta="Recevoir le lien"
      onPrimary={onNext}
    >
      <p style={{ color: 'var(--ink-mute)', fontSize: 14.5, lineHeight: 1.55, marginBottom: 28 }}>
        HerDay est un carnet d’observation pour t’aider à mieux accompagner ta compagne. Aucune notification, aucune saisie ne lui sera jamais demandée.
      </p>
      <div>
        <label className="caps ink-mute" style={{ display: 'block', marginBottom: 6 }}>
          Email
        </label>
        <input
          className="hd-input"
          placeholder="toi@exemple.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)', marginTop: 10, letterSpacing: '0.04em' }}>
          On t’envoie un lien magique. Pas de mot de passe.
        </p>
      </div>
    </OnbStep>
  );
}

function OnbPacte({ onNext, onBack, step, total }) {
  const [choice, setChoice] = React.useState(null);
  return (
    <OnbStep
      index={step}
      total={total}
      eyebrow="Pacte de transparence"
      title="Une app utilisée en silence remplace la conversation au lieu de la nourrir."
      cta={choice === 'already' ? 'Je lui en ai déjà parlé' : 'Je lui en parle bientôt'}
      onPrimary={() => { setChoice(choice || 'soon'); onNext(); }}
      onBack={onBack}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-soft)' }}>
          HerDay est ton carnet. Il n’envoie rien à ta compagne. Il ne lui apparaît dans aucune notification.
        </p>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink-soft)' }}>
          Mais on te recommande très fortement de lui en parler, et même de lui montrer. Pourquoi&nbsp;: un outil d’observation utilisé en silence finit par remplacer la conversation au lieu de la nourrir. C’est l’inverse de ce qu’on veut ici.
        </p>

        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <PactChoice
            label="Je lui en parlerai bientôt"
            selected={choice === 'soon'}
            onClick={() => setChoice('soon')}
          />
          <PactChoice
            label="Je lui en ai déjà parlé"
            selected={choice === 'already'}
            onClick={() => setChoice('already')}
          />
        </div>
      </div>
    </OnbStep>
  );
}

function PactChoice({ label, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      className="hd-btn hd-btn-ghost"
      style={{
        textAlign: 'left',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: selected ? 'var(--paper-warm)' : 'transparent',
        borderColor: selected ? 'var(--ink)' : 'var(--rule)',
        borderWidth: selected ? 1 : 0.5,
      }}
    >
      <span style={{ fontSize: 14 }}>{label}</span>
      <span style={{
        width: 16, height: 16, borderRadius: '50%',
        border: '1px solid ' + (selected ? 'var(--ink)' : 'var(--rule)'),
        background: selected ? 'var(--ink)' : 'transparent',
      }}></span>
    </button>
  );
}

function OnbCycle({ onNext, onBack, step, total }) {
  return (
    <OnbStep
      index={step}
      total={total}
      eyebrow="Le cycle, mesurable"
      title="Six sous-phases, quatre hormones. Pas un mystère."
      cta="Continuer"
      onPrimary={onNext}
      onBack={onBack}
    >
      <p style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--ink-mute)', marginBottom: 16 }}>
        Le langage par défaut de HerDay est celui de la littérature médicale. Sobre, exact, sans métaphore.
      </p>

      <div style={{ background: 'var(--paper-warm)', borderRadius: 14, padding: '16px 8px 8px' }}>
        <HormoneGraph currentDay={13} height={170} />
      </div>

      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {PHASES.map((p) => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 0',
              fontSize: 13,
            }}
          >
            <span className="hd-swatch" style={{ background: p.color }}></span>
            <span style={{ flex: 1, color: 'var(--ink)' }}>{p.short}</span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)' }}>
              {p.range}
            </span>
          </div>
        ))}
      </div>
    </OnbStep>
  );
}

function OnbFirstEntry({ onNext, onBack, step, total }) {
  const [date, setDate] = React.useState('');
  const [length, setLength] = React.useState('');
  return (
    <OnbStep
      index={step}
      total={total}
      eyebrow="Première saisie"
      title="Quand ses dernières règles ont-elles commencé, à ta connaissance ?"
      cta="Ouvrir mon carnet"
      onPrimary={onNext}
      onBack={onBack}
    >
      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink-mute)', marginBottom: 28 }}>
        L’imprécision est normale et n’invalide rien. Tu pourras corriger à tout moment.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <label className="caps ink-mute" style={{ display: 'block', marginBottom: 6 }}>
            Date approximative
          </label>
          <input
            className="hd-input"
            placeholder="ex. il y a 6 jours · 12 mai"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="caps ink-mute" style={{ display: 'block', marginBottom: 6 }}>
            Longueur de son cycle (facultatif)
          </label>
          <input
            className="hd-input"
            placeholder="ex. 28 jours · je ne sais pas"
            value={length}
            onChange={(e) => setLength(e.target.value)}
          />
          <p className="mono" style={{ fontSize: 10, color: 'var(--ink-faint)', marginTop: 8, letterSpacing: '0.04em' }}>
            Score de confiance bas tant que tu n’es pas sûr. C’est sain.
          </p>
        </div>
      </div>
    </OnbStep>
  );
}

function Onboarding({ onComplete }) {
  const [step, setStep] = React.useState(0);
  const total = 4;
  const next = () => (step < total - 1 ? setStep(step + 1) : onComplete());
  const back = step > 0 ? () => setStep(step - 1) : null;
  const props = { step, total, onNext: next, onBack: back };
  if (step === 0) return <OnbConnexion {...props} />;
  if (step === 1) return <OnbPacte {...props} />;
  if (step === 2) return <OnbCycle {...props} />;
  return <OnbFirstEntry {...props} />;
}

Object.assign(window, {
  Onboarding,
  OnbConnexion,
  OnbPacte,
  OnbCycle,
  OnbFirstEntry,
});
