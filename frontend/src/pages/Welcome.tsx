import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { BetaPlatform, BetaSignupResult } from '../api/client';
import { ZONE_HEX, ZONE_ORDER } from '../constants/phases';
import type { Zone } from '../constants/phases';
import { ZONE_ICON_PATHS } from '../lib/zones';

/**
 * Public landing page for beta testers: what the app does, sign-up form, then the install
 * links (personal APK link, TestFlight), which are only given once the form is filled.
 */

type Done = { name: string; platform: BetaPlatform; links: BetaSignupResult };

// Lets a tester coming back find their links without signing up again.
const DONE_KEY = 'herdays-beta-signup';

function loadDone(): Done | null {
  try {
    const raw = localStorage.getItem(DONE_KEY);
    return raw ? (JSON.parse(raw) as Done) : null;
  } catch {
    return null;
  }
}

function saveDone(done: Done | null) {
  try {
    if (done) localStorage.setItem(DONE_KEY, JSON.stringify(done));
    else localStorage.removeItem(DONE_KEY);
  } catch {
    // storage unavailable (private mode): the links stay shown for this visit
  }
}

function ZoneIcon({ zone, size = 22 }: { zone: Zone; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ stroke: ZONE_HEX[zone] }}
      aria-hidden="true"
    >
      <path d={ZONE_ICON_PATHS[zone]} />
    </svg>
  );
}

const FEATURES: { key: 'dial' | 'notebook' | 'agenda'; zone: Zone }[] = [
  { key: 'dial', zone: 'jour' },
  { key: 'notebook', zone: 'crepuscule' },
  { key: 'agenda', zone: 'aube' },
];

const cardClass = 'rounded-3xl border border-warm-200/40 bg-surface p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]';
const inputClass =
  'w-full rounded-2xl border border-warm-200 bg-warm-50 px-4 py-3 text-[16px] text-ink placeholder-warm-400 transition-all focus:border-[#DC3D5A]/40 focus:outline-none focus:ring-2 focus:ring-[#DC3D5A]/30';
const labelClass = 'mb-1.5 block text-[14px] font-semibold text-ink';
const buttonClass =
  'inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#DC3D5A] to-[#E8647D] px-5 py-3.5 text-[15px] font-semibold text-white transition-opacity disabled:opacity-60';
const stepsClass = 'whitespace-pre-line text-[14px] leading-relaxed text-ink-soft';

export default function Welcome() {
  const { t } = useTranslation(['welcome', 'onboarding']);
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [platform, setPlatform] = useState<BetaPlatform | null>(null);
  const [source, setSource] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const [done, setDone] = useState<Done | null>(loadDone);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !email.trim() || !platform || sending) return;
    setSending(true);
    setError(false);
    try {
      const links = await api.beta.signup({ first_name: firstName.trim(), email: email.trim(), platform, source, message, website });
      const next = { name: firstName.trim(), platform, links };
      setDone(next);
      saveDone(next);
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  };

  const restart = () => {
    setDone(null);
    saveDone(null);
  };

  return (
    <div className="min-h-screen bg-warm-50 px-5 pb-16 pt-12">
      <div className="mx-auto w-full max-w-lg animate-fade-in-up">
        {/* Hero */}
        <header className="text-center">
          <div className="hd-caps text-warm-500">{t('eyebrow')}</div>
          <h1 className="mt-3 text-5xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-[#DC3D5A] to-[#E8647D] bg-clip-text text-transparent">HerDays</span>
          </h1>
          <div className="mt-4 flex justify-center gap-3" aria-hidden="true">
            {ZONE_ORDER.map((z) => (
              <ZoneIcon key={z} zone={z} size={20} />
            ))}
          </div>
          <p className="mt-5 text-[16px] leading-relaxed text-ink-soft">{t('intro')}</p>
        </header>

        {/* The straight talk from the onboarding's first screen (same texts, single source). */}
        <section className={`${cardClass} mt-8`}>
          <h2 className="text-2xl font-bold tracking-tight text-ink">{t('onboarding:step1.title')}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{t('onboarding:step1.body')}</p>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{t('onboarding:step1.body2')}</p>
          <p className="mt-5 text-[16px] font-semibold leading-relaxed text-ink">{t('onboarding:step1.tagline')}</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{t('onboarding:step1.body3')}</p>
          <p className="mt-5 text-[14px] italic leading-relaxed text-warm-500">{t('onboarding:step1.aside')}</p>
        </section>

        {/* What it does */}
        <section className="mt-10 flex flex-col gap-3">
          {FEATURES.map(({ key, zone }) => (
            <div key={key} className="flex gap-4 rounded-2xl border border-warm-200/40 bg-surface px-5 py-4">
              <div className="mt-0.5 shrink-0">
                <ZoneIcon zone={zone} />
              </div>
              <div>
                <div className="text-[15px] font-semibold text-ink">{t(`features.${key}_title`)}</div>
                <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">{t(`features.${key}_body`)}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Sign-up */}
        <section className="mt-12" id="inscription">
          <h2 className="text-2xl font-bold tracking-tight text-ink">{t('form.title')}</h2>
          <p className="mt-2 text-[15px] text-ink-soft">{t('form.body')}</p>

          {done ? (
            <div className={`${cardClass} mt-5`} role="status">
              <div className="text-[17px] font-bold text-ink">{t('form.done_title', { name: done.name })}</div>
              {done.platform === 'android' && done.links.download_url && (
                <>
                  <p className={`mt-2 ${stepsClass}`}>{t('form.done_android_link')}</p>
                  <a href={done.links.download_url} className={`${buttonClass} mt-4`} download>
                    {t('android.cta')}
                  </a>
                  <p className={`mt-4 ${stepsClass}`}>{t('android.steps')}</p>
                </>
              )}
              {done.platform === 'android' && !done.links.download_url && (
                <p className={`mt-2 ${stepsClass}`}>{t('form.done_android_invite')}</p>
              )}
              {done.platform === 'ios' && done.links.testflight_url && (
                <>
                  <p className={`mt-2 ${stepsClass}`}>{t('form.done_ios_link')}</p>
                  <p className={`mt-3 ${stepsClass}`}>{t('ios.steps_link')}</p>
                  <a href={done.links.testflight_url} className={`${buttonClass} mt-4`} target="_blank" rel="noopener noreferrer">
                    {t('ios.cta')}
                  </a>
                </>
              )}
              {done.platform === 'ios' && !done.links.testflight_url && (
                <p className={`mt-2 ${stepsClass}`}>{t('form.done_ios_invite')}</p>
              )}
              <button type="button" onClick={restart} className="mt-5 text-[13px] font-medium text-warm-500 underline-offset-4 hover:underline">
                {t('form.change')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={`${cardClass} mt-5 flex flex-col gap-5`}>
              <div>
                <label htmlFor="w-first-name" className={labelClass}>{t('form.first_name')}</label>
                <input
                  id="w-first-name"
                  className={inputClass}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  maxLength={80}
                  required
                />
              </div>

              <div>
                <label htmlFor="w-email" className={labelClass}>{t('form.email')}</label>
                <input
                  id="w-email"
                  type="email"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
                <p className="mt-1.5 text-[12.5px] text-warm-500">{t('form.email_hint')}</p>
              </div>

              <fieldset>
                <legend className={labelClass}>{t('form.platform')}</legend>
                <div className="grid grid-cols-2 gap-3">
                  {(['ios', 'android'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={platform === p}
                      onClick={() => setPlatform(p)}
                      className={`rounded-2xl border px-4 py-3 text-[15px] font-semibold transition-colors ${
                        platform === p
                          ? 'border-[#DC3D5A] bg-[#DC3D5A]/10 text-ink'
                          : 'border-warm-200 bg-warm-50 text-ink-soft'
                      }`}
                    >
                      {t(`${p}.title`)}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="w-source" className={labelClass}>
                  {t('form.source')} <span className="font-normal text-warm-500">({t('form.optional')})</span>
                </label>
                <input
                  id="w-source"
                  className={inputClass}
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder={t('form.source_placeholder')}
                  maxLength={200}
                />
              </div>

              <div>
                <label htmlFor="w-message" className={labelClass}>
                  {t('form.message')} <span className="font-normal text-warm-500">({t('form.optional')})</span>
                </label>
                <textarea
                  id="w-message"
                  className={`${inputClass} min-h-[96px] resize-y`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('form.message_placeholder')}
                  maxLength={1000}
                />
              </div>

              {/* Honeypot: hidden from people, filled by bots. */}
              <div className="hidden" aria-hidden="true">
                <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" />
              </div>

              {error && <p className="text-sm font-medium text-[#DC3D5A]">{t('form.error')}</p>}

              <button type="submit" className={buttonClass} disabled={sending || !platform}>
                {sending ? t('form.sending') : t('form.submit')}
              </button>
              <p className="text-[12.5px] leading-relaxed text-warm-500">{t('form.privacy')}</p>
            </form>
          )}
        </section>

        <footer className="mt-12 text-center">
          <Link to="/login" className="text-[14px] font-medium text-warm-500 underline-offset-4 hover:underline">
            {t('footer_login')}
          </Link>
        </footer>
      </div>
    </div>
  );
}
