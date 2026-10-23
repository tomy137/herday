// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Contraception, ExpertiseLevel, Pronouns } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { Phase } from '../lib/cycle-engine';
import { formatDate, today } from '../lib/date-utils';
import { ZONE_INK_HEX, ZONE_ORDER } from '../constants/phases';
import type { Zone } from '../constants/phases';
import OnbStep from '../components/onboarding/OnbStep';
import PactChoice from '../components/onboarding/PactChoice';
import CycleDial from '../components/home/CycleDial';
import { zoneBounds } from '../lib/zones';

const TOTAL = 7;
const LEVELS: ExpertiseLevel[] = ['decouverte', 'bases', 'expert'];
const PRONOUNS: Pronouns[] = ['elle', 'il', 'iel'];
const CONTRACEPTION: Contraception[] = ['non', 'oui', 'inconnu'];
/** The phase shown on the dial for each moment of the « cycle as a day » step. */
const ZONE_PHASE: Record<Zone, Phase> = {
  nuit: 'menstruation',
  aube: 'post_menstrual',
  jour: 'ovulation',
  crepuscule: 'post_ovulatory',
};

function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  labelOf,
}: {
  options: T[];
  value: T | null;
  onChange: (v: T) => void;
  label: string;
  labelOf: (v: T) => string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-1 rounded-[14px] border border-warm-300 bg-warm-100 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const on = o === value;
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o)}
            className={`min-h-[40px] rounded-[10px] text-[14px] transition-colors ${on ? 'bg-ink font-bold text-warm-50' : 'text-ink-soft'}`}
          >
            {labelOf(o)}
          </button>
        );
      })}
    </div>
  );
}

export default function Onboarding() {
  const { t } = useTranslation('onboarding');
  const { t: tPhases } = useTranslation('phases');
  const { t: tCommon } = useTranslation('common');
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [pact, setPact] = useState<'soon' | 'already' | null>(null);
  const [level, setLevel] = useState<ExpertiseLevel>('decouverte');
  const [nickname, setNickname] = useState('');
  const [pronouns, setPronouns] = useState<Pronouns>('elle');
  const [zone, setZone] = useState<Zone>('jour');
  const [date, setDate] = useState('');
  const [unknownDate, setUnknownDate] = useState(false);
  const [length, setLength] = useState('');
  const [contraception, setContraception] = useState<Contraception>('non');
  const [submitting, setSubmitting] = useState(false);

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

  const saveProfile = async () => {
    await api.users
      .update({ expertise_level: level, partner_nickname: nickname.trim(), partner_pronouns: pronouns })
      .catch(() => {});
    await refreshUser();
    next();
  };

  const finish = async () => {
    setSubmitting(true);
    try {
      await api.users.update({ contraception }).catch(() => {});
      if (date && !unknownDate) {
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
    'w-full rounded-[14px] border border-warm-300 bg-warm-100 px-3.5 py-3 text-[16px] text-ink outline-none transition-colors focus:border-ink';
  const bodyClass = 'text-[14.5px] leading-relaxed text-ink-soft';

  if (step === 0) {
    return (
      <OnbStep index={0} total={TOTAL} eyebrow={t('step1.eyebrow')} title={t('step1.title')} cta={t('step1.cta')} onPrimary={next}>
        <p className={bodyClass}>{t('step1.body')}</p>
        <p className="mt-5 text-[15px] font-semibold leading-relaxed text-ink">{t('step1.tagline')}</p>
        <p className={`mt-1.5 ${bodyClass}`}>{t('step1.body2')}</p>
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
          <p className={bodyClass}>{t('step2.body1')}</p>
          <p className={bodyClass}>{t('step2.body2')}</p>
          <div className="mt-2 flex flex-col gap-2">
            <PactChoice label={t('step2.choice_soon')} selected={pact === 'soon'} onClick={() => setPact('soon')} />
            <PactChoice label={t('step2.choice_already')} selected={pact === 'already'} onClick={() => setPact('already')} />
          </div>
          <p className="text-[12.5px] text-warm-500">{t('step2.change_later')}</p>
        </div>
      </OnbStep>
    );
  }

  if (step === 2) {
    return (
      <OnbStep index={2} total={TOTAL} eyebrow={t('step_partner.eyebrow')} title={t('step_partner.title')} cta={t('step_partner.cta')} onPrimary={saveProfile} onBack={back}>
        <p className="mb-4 text-[14px] leading-relaxed text-warm-500">{t('step_partner.body')}</p>
        <div role="radiogroup" aria-label={t('step_partner.title')} className="flex flex-col gap-2">
          {LEVELS.map((l) => {
            const on = l === level;
            return (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setLevel(l)}
                className={`flex flex-col gap-0.5 rounded-[16px] border-2 bg-warm-100 px-4 py-3 text-left transition-colors ${on ? 'border-ink' : 'border-warm-300'}`}
              >
                <span className="text-[15px] font-bold text-ink">{t(`step_partner.level.${l}.title`)}</span>
                <span className="text-[12.5px] text-warm-500">{t(`step_partner.level.${l}.body`)}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex flex-col gap-1.5">
          <label htmlFor="onb-nickname" className="text-[13px] font-medium text-ink-soft">
            {t('step_partner.nickname_label')} <span className="font-normal text-warm-500">{t('step_partner.optional')}</span>
          </label>
          <input id="onb-nickname" type="text" maxLength={40} value={nickname} onChange={(e) => setNickname(e.target.value)} aria-describedby="onb-nickname-hint" className={inputClass} />
          <p id="onb-nickname-hint" className="text-[12px] leading-snug text-warm-500">{t('step_partner.nickname_hint')}</p>
        </div>
        <div className="mt-5 flex flex-col gap-1.5">
          <div className="text-[13px] font-medium text-ink-soft">{t('step_partner.pronouns_label')}</div>
          <Segmented
            options={PRONOUNS}
            value={pronouns}
            onChange={setPronouns}
            label={t('step_partner.pronouns_label')}
            labelOf={(p) => tCommon(`partner.pronoun.${p}`).toLowerCase()}
          />
        </div>
      </OnbStep>
    );
  }

  if (step === 3) {
    const bounds = zoneBounds(28);
    const b = bounds[zone];
    const mid = b ? Math.round((b[0] + b[1]) / 2) : 14;
    return (
      <OnbStep index={3} total={TOTAL} eyebrow={t('step3.eyebrow')} title={t('step3.title')} cta={t('step3.cta')} onPrimary={next} onBack={back}>
        <p className="mb-3 text-[14px] leading-relaxed text-warm-500">{t('step3.body')}</p>
        <CycleDial dayInCycle={mid > 28 ? mid - 28 : mid} cycleLength={28} phase={ZONE_PHASE[zone]} zoneEndsIn={null} size={210} />
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {ZONE_ORDER.map((z) => {
            const on = z === zone;
            return (
              <button
                key={z}
                type="button"
                aria-pressed={on}
                onClick={() => setZone(z)}
                className="min-h-[44px] rounded-[12px] border text-[12px] font-bold"
                style={{
                  background: on ? ZONE_INK_HEX[z] : 'var(--color-warm-100)',
                  borderColor: on ? ZONE_INK_HEX[z] : 'var(--color-warm-300)',
                  color: on ? 'var(--color-on-accent)' : 'var(--color-ink)',
                }}
              >
                {tPhases(`zones.${z}`)}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-col gap-1.5 rounded-[18px] bg-warm-100 px-4 py-3.5">
          <div className="text-[12px] text-warm-500">{t(`moments.${zone}.phases`)}</div>
          <p className="text-[14.5px] leading-relaxed text-ink">{t(`moments.${zone}.body`)}</p>
          <p className="text-[13px] font-bold" style={{ color: ZONE_INK_HEX[zone] }}>{t(`moments.${zone}.posture`)}</p>
        </div>
        <p className="mt-3 text-[12.5px] leading-snug text-warm-500">{t('step3.more_info')}</p>
      </OnbStep>
    );
  }

  if (step === 4) {
    return (
      <OnbStep index={4} total={TOTAL} eyebrow={t('step_obs.eyebrow')} title={t('step_obs.title')} cta={t('step_obs.cta')} onPrimary={next} onBack={back}>
        <div className="flex flex-col gap-5">
          <div>
            <div className="hd-caps mb-1.5 text-warm-500">{t('step_obs.obs_label')}</div>
            <p className={bodyClass}>{t('step_obs.obs_body')}</p>
          </div>
          <div>
            <div className="hd-caps mb-1.5 text-warm-500">{t('step_obs.echo_label')}</div>
            <p className={bodyClass}>{t('step_obs.echo_body')}</p>
          </div>
        </div>
      </OnbStep>
    );
  }

  if (step === 5) {
    return (
      <OnbStep index={5} total={TOTAL} eyebrow={t('step4.eyebrow')} title={t('step4.title')} cta={t('step4.cta_next')} onPrimary={next} onBack={back}>
        <p className="mb-5 text-[13.5px] leading-relaxed text-warm-500">{t('step4.body')}</p>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="onb-date" className="text-[13px] font-medium text-ink-soft">{t('step4.date_label')}</label>
            <input id="onb-date" type="date" max={formatDate(today())} value={date} disabled={unknownDate} onChange={(e) => setDate(e.target.value)} className={`${inputClass} disabled:opacity-40`} />
            <label className="flex min-h-[44px] items-center gap-2.5 text-[14px] text-ink-soft">
              <input type="checkbox" checked={unknownDate} onChange={(e) => setUnknownDate(e.target.checked)} className="h-5 w-5" style={{ accentColor: 'var(--color-ink)' }} />
              {t('step4.unknown')}
            </label>
            {unknownDate && <p className="rounded-[14px] bg-warm-100 px-3.5 py-3 text-[13px] leading-snug text-ink-soft">{t('step4.unknown_hint')}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="onb-length" className="text-[13px] font-medium text-ink-soft">
              {t('step4.length_label')}
            </label>
            <input id="onb-length" type="number" min={15} max={50} inputMode="numeric" value={length} onChange={(e) => setLength(e.target.value)} aria-describedby="onb-length-hint" className={inputClass} />
            <p id="onb-length-hint" className="text-[12px] text-warm-500">{t('step4.length_hint')}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="text-[13px] font-medium text-ink-soft">{t('step4.contraception_label')}</div>
            <Segmented
              options={CONTRACEPTION}
              value={contraception}
              onChange={setContraception}
              label={t('step4.contraception_label')}
              labelOf={(c) => t(`step4.contraception.${c}`)}
            />
            {contraception === 'oui' && <p className="text-[12.5px] leading-snug text-ink-soft">{t('step4.contraception_hint')}</p>}
          </div>
          <div className="rounded-[16px] border border-warm-300 px-4 py-3 text-[13px] leading-snug text-ink-soft">
            <strong className="text-ink">{t('step4.confidence_title')}</strong> {t('step4.confidence_body')}
          </div>
        </div>
      </OnbStep>
    );
  }

  return (
    <OnbStep
      index={6}
      total={TOTAL}
      eyebrow={t('step_tools.eyebrow')}
      title={t('step_tools.title')}
      cta={t('step4.cta')}
      primaryDisabled={submitting}
      onPrimary={finish}
      onBack={back}
    >
      <div className="flex flex-col gap-3">
        <div className="rounded-[20px] bg-warm-100 px-4 py-4">
          <div className="text-[15px] font-bold text-ink">{t('step_tools.agenda_title')}</div>
          <p className="mt-1 text-[13.5px] leading-snug text-ink-soft">{t('step_tools.agenda_body')}</p>
        </div>
        <div className="rounded-[20px] bg-warm-100 px-4 py-4">
          <div className="text-[15px] font-bold text-ink">{t('step_tools.widget_title')}</div>
          <p className="mt-1 text-[13.5px] leading-snug text-ink-soft">{t('step_tools.widget_body')}</p>
        </div>
        <p className="text-[12.5px] text-warm-500">{t('step_tools.later')}</p>
      </div>
    </OnbStep>
  );
}
