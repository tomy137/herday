// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { Phase } from '../lib/cycle-engine';
import { formatDate, today } from '../lib/date-utils';
import { PHASE_HEX, PHASE_SOFT_HEX, PHASE_INK_HEX } from '../constants/phases';
import { PHASE_ORDER, PHASE_RANGES_28 } from '../constants/phase-meta';
import OnbStep from '../components/onboarding/OnbStep';
import PactChoice from '../components/onboarding/PactChoice';
import CycleGraph from '../components/CycleGraph';

const TOTAL = 4;

export default function Onboarding() {
  const { t } = useTranslation('onboarding');
  const { t: tPhases } = useTranslation('phases');
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [pact, setPact] = useState<'soon' | 'already' | null>(null);
  const [date, setDate] = useState('');
  const [length, setLength] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [graphPhase, setGraphPhase] = useState<Phase>('pre_ovulatory');

  const next = () => setStep((s) => s + 1);
  const back = step > 0 ? () => setStep((s) => s - 1) : undefined;

  const savePact = async () => {
    if (pact) {
      await api.users
        .update({ transparency_status: pact === 'already' ? 'told_already' : 'told_soon' })
        .catch(() => {});
      await refreshUser();
    }
    next();
  };

  const finish = async () => {
    setSubmitting(true);
    try {
      if (date) {
        await api.events.create({ event_type: 'period_started', event_date: date, confidence: 0.8 });
      }
      const len = parseInt(length, 10);
      if (!Number.isNaN(len) && len >= 15 && len <= 50) {
        await api.events.create({
          event_type: 'cycle_length_info',
          event_date: formatDate(today()),
          metadata: { cycle_length: len },
        });
      }
      await refreshUser();
      navigate('/', { replace: true });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full border-0 border-b-[0.5px] border-warm-300 bg-transparent py-2.5 text-[15px] text-ink outline-none transition-colors focus:border-ink';

  if (step === 0) {
    return (
      <OnbStep index={0} total={TOTAL} eyebrow={t('step1.eyebrow')} title={t('step1.title')} cta={t('step1.cta')} onPrimary={next}>
        <p className="text-[14.5px] leading-relaxed text-warm-500">{t('step1.body')}</p>
      </OnbStep>
    );
  }

  if (step === 1) {
    return (
      <OnbStep
        index={1}
        total={TOTAL}
        eyebrow={t('step2.eyebrow')}
        title={t('step2.title')}
        cta={t('step2.cta')}
        primaryDisabled={!pact}
        onPrimary={savePact}
        onBack={back}
      >
        <div className="flex flex-col gap-4">
          <p className="text-[14.5px] leading-relaxed text-ink-soft">{t('step2.body1')}</p>
          <p className="text-[14.5px] leading-relaxed text-ink-soft">{t('step2.body2')}</p>
          <div className="mt-2 flex flex-col gap-2">
            <PactChoice label={t('step2.choice_soon')} selected={pact === 'soon'} onClick={() => setPact('soon')} />
            <PactChoice label={t('step2.choice_already')} selected={pact === 'already'} onClick={() => setPact('already')} />
          </div>
        </div>
      </OnbStep>
    );
  }

  if (step === 2) {
    const band = PHASE_RANGES_28[graphPhase];
    const cursorDay = Math.round((band.from + band.to) / 2);
    return (
      <OnbStep index={2} total={TOTAL} eyebrow={t('step3.eyebrow')} title={t('step3.title')} cta={t('step3.cta')} onPrimary={next} onBack={back}>
        <p className="mb-4 text-[14px] leading-relaxed text-warm-500">{t('step3.body')}</p>
        <div className="rounded-[14px] bg-warm-100 px-2 pb-2 pt-4">
          <CycleGraph dayInCycle={cursorDay} cycleLength={28} phase={graphPhase} onSelectPhase={setGraphPhase} />
        </div>
        <div className="mt-[18px] flex flex-col gap-1">
          {PHASE_ORDER.map((id) => {
            const active = id === graphPhase;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setGraphPhase(id)}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] transition-colors"
                style={{ background: active ? PHASE_SOFT_HEX[id] : 'transparent' }}
              >
                <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: PHASE_HEX[id] }} />
                <span className="flex-1 text-left" style={{ color: active ? PHASE_INK_HEX[id] : 'var(--color-ink)' }}>
                  {tPhases(`${id}.short`)}
                </span>
                <span className="hd-meta text-warm-400">{tPhases(`${id}.range`)}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-[12.5px] leading-snug text-warm-400">{t('step3.more_info')}</p>
      </OnbStep>
    );
  }

  return (
    <OnbStep
      index={3}
      total={TOTAL}
      eyebrow={t('step4.eyebrow')}
      title={t('step4.title')}
      cta={t('step4.cta')}
      primaryDisabled={submitting}
      onPrimary={finish}
      onBack={back}
    >
      <p className="mb-7 text-[13.5px] leading-relaxed text-warm-500">{t('step4.body')}</p>
      <div className="flex flex-col gap-5">
        <div>
          <label className="hd-caps mb-1.5 block text-warm-500">{t('step4.date_label')}</label>
          <input type="date" max={formatDate(today())} value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="hd-caps mb-1.5 block text-warm-500">{t('step4.length_label')}</label>
          <input
            type="number"
            min={15}
            max={50}
            placeholder="28"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            className={inputClass}
          />
          <p className="hd-meta mt-2 text-warm-400">{t('step4.length_hint')}</p>
        </div>
      </div>
    </OnbStep>
  );
}
