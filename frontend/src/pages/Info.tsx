import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { PhaseInfo } from '../api/client';
import type { Phase } from '../lib/cycle-engine';
import { PHASE_HEX, PHASE_SOFT_HEX, PHASE_INK_HEX } from '../constants/phases';
import { PHASE_ORDER } from '../constants/phase-meta';
import CycleGraph from '../components/CycleGraph';

/** References behind the phase content. Links open a public search, not a shop. */
const SOURCES = [
  {
    title: 'Kiffe ton cycle !',
    author: 'G. Baldassari',
    url: 'https://www.google.com/search?q=%22Kiffe+ton+cycle%22+Baldassari',
  },
];

export default function Info() {
  const { t } = useTranslation('info');
  const navigate = useNavigate();
  const [phaseInfo, setPhaseInfo] = useState<PhaseInfo | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);

  // Deep link from Settings › Sources (/info#sources).
  useEffect(() => {
    if (window.location.hash === '#sources') {
      window.setTimeout(() => document.getElementById('sources')?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, []);

  useEffect(() => {
    api.phases.today()
      .then((d) => {
        setPhaseInfo(d);
        setSelectedPhase(d.phase as Phase);
      })
      .catch(() => {});
  }, []);

  const highlighted = selectedPhase ?? (phaseInfo?.phase as Phase | undefined) ?? null;

  return (
    <div className="p-5 space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-warm-100 text-warm-400 transition-all duration-200 active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-ink tracking-tight">{t('title')}</h1>
      </div>

      {/* Hormone graph (click a band to highlight a phase) */}
      <section className="bg-surface rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-warm-200/40">
        <CycleGraph
          dayInCycle={phaseInfo?.day_in_cycle ?? 0}
          cycleLength={phaseInfo?.cycle_length ?? 28}
          phase={highlighted}
          onSelectPhase={setSelectedPhase}
        />
      </section>

      {/* How phases are calculated — right under the graph, interactive */}
      <section className="bg-surface rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-warm-200/40 space-y-3">
        <h2 className="text-sm font-bold text-ink uppercase tracking-wider">{t('phases.title')}</h2>
        <p className="text-xs text-warm-500 leading-relaxed">{t('phases.ogino')}</p>
        <div className="rounded-xl bg-warm-50 p-3">
          <p className="text-xs font-mono text-ink-soft text-center">{t('phases.formula')}</p>
        </div>
        <p className="text-xs text-warm-500 leading-relaxed">{t('phases.example')}</p>
        <div className="space-y-1.5">
          {PHASE_ORDER.map((p) => {
            const active = highlighted === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setSelectedPhase(p)}
                className="w-full text-left rounded-lg px-3 py-2.5 transition-colors"
                style={{
                  background: active ? PHASE_SOFT_HEX[p] : 'var(--color-warm-50)',
                  borderLeft: `3px solid ${active ? PHASE_HEX[p] : 'transparent'}`,
                }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className="text-xs font-semibold"
                    style={{ color: active ? PHASE_INK_HEX[p] : 'var(--color-ink)' }}
                  >
                    {t(`phases.breakdown.${p}.name`)}
                  </span>
                  <span className="text-xs text-warm-400 shrink-0">{t(`phases.breakdown.${p}.days`)}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-warm-500">{t(`glossary.${p}.def`)}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Glossary — only the non-phase terms now (phase defs live above) */}
      <section className="bg-surface rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-warm-200/40 space-y-3">
        <h2 className="text-sm font-bold text-ink uppercase tracking-wider">{t('glossary.title')}</h2>
        {(['cycle', 'estradiol', 'progesterone', 'lh', 'fsh', 'pms', 'ogino'] as const).map((key) => (
          <div key={key}>
            <p className="text-sm font-semibold text-ink">{t(`glossary.${key}.term`)}</p>
            <p className="text-xs text-warm-500 leading-relaxed">{t(`glossary.${key}.def`)}</p>
          </div>
        ))}
      </section>

      {/* Confidence */}
      <section className="bg-surface rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-warm-200/40 space-y-3">
        <h2 className="text-sm font-bold text-ink uppercase tracking-wider">{t('confidence.title')}</h2>
        <div className="space-y-1.5">
          {(['unknown', 'estimating', 'partial', 'learning', 'confident'] as const).map((s) => (
            <div key={s} className="flex justify-between items-center rounded-lg bg-warm-50 px-3 py-2">
              <span className="text-xs font-semibold text-ink">{t(`confidence.states.${s}.label`)}</span>
              <span className="text-xs text-warm-400">{t(`confidence.states.${s}.condition`)}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-warm-500 leading-relaxed">{t('confidence.hint')}</p>
      </section>

      {/* Limitations */}
      <section className="bg-surface rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-warm-200/40 space-y-3">
        <h2 className="text-sm font-bold text-ink uppercase tracking-wider">{t('limits.title')}</h2>
        {(['not_medical', 'mood_weak', 'irregular', 'improves'] as const).map((key) => (
          <div key={key} className="flex gap-2">
            <span className="text-xs shrink-0">⚠️</span>
            <p className="text-xs text-warm-500 leading-relaxed">{t(`limits.${key}`)}</p>
          </div>
        ))}
      </section>

      {/* Sources */}
      <section id="sources" className="bg-surface rounded-2xl p-5 border border-warm-200/40 space-y-3 scroll-mt-4">
        <h2 className="text-sm font-bold text-ink uppercase tracking-wider">{t('sources.title')}</h2>
        <p className="text-xs text-warm-500 leading-relaxed">{t('sources.intro')}</p>
        <ul className="space-y-2">
          {SOURCES.map((s) => (
            <li key={s.title}>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-warm-300 px-3.5 py-3 text-ink transition-colors hover:bg-warm-100"
              >
                <span className="block text-[14px] font-semibold">{s.title}</span>
                <span className="block text-[12px] text-warm-500">{s.author} ↗</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
