// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import type { EchoAggregate } from '../api/client';
import type { Phase } from '../lib/cycle-engine';
import { PHASE_HEX } from '../constants/phases';
import { PHASE_ORDER, PASTILLE_GLYPHS } from '../constants/phase-meta';
import type { PastilleId } from '../constants/phase-meta';
import Header from '../components/layout/Header';
import EchoRow from '../components/home/EchoRow';
import FrequencyRow from '../components/echoes/FrequencyRow';

export default function Echoes() {
  const { t } = useTranslation('echoes');
  const { t: tPhases } = useTranslation('phases');
  const { t: tJournal } = useTranslation('journal');
  const { t: tCommon } = useTranslation('common');

  const [searchParams] = useSearchParams();
  const [selected, setSelected] = useState<Phase | null>(null);
  const [echo, setEcho] = useState<EchoAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  useEffect(() => {
    (async () => {
      const request = ++requestId.current;
      try {
        const param = searchParams.get('phase');
        const initial =
          param && (PHASE_ORDER as readonly string[]).includes(param) ? (param as Phase) : null;
        const phase = initial ?? ((await api.phases.today()).phase as Phase);
        const next = initial ? await api.echoes.forPhase(initial) : await api.echoes.current();
        if (request !== requestId.current) return; // the user already picked another phase
        setSelected(phase);
        setEcho(next);
      } catch {
        // ignore
      } finally {
        if (request === requestId.current) setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Switch phase: drop the previous phase's content right away, then load the
   *  new one. A slow answer never lands on a phase the user already left. */
  const selectPhase = async (phase: Phase) => {
    const request = ++requestId.current;
    setSelected(phase);
    setEcho(null);
    setLoading(true);
    try {
      const next = await api.echoes.forPhase(phase);
      if (request === requestId.current) setEcho(next);
    } catch {
      if (request === requestId.current) setEcho(null);
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  };

  const monthLabel = (iso: string) =>
    new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
      .format(new Date(iso))
      .replace(/^\w/, (c) => c.toUpperCase());

  const hasContent =
    echo && (echo.frequent.length > 0 || echo.helpful.length > 0 || echo.not_helpful.length > 0 || echo.history.length > 0);

  return (
    <div>
      <Header rightLabel={tCommon('nav.echoes').toUpperCase()} />
      <div className="flex flex-col gap-5 px-[22px] pb-6 pt-2">
        <div>
          <div className="hd-caps mb-2 text-warm-400">{t('eyebrow')}</div>
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">
            {t('title', { phase: selected ? tPhases(`${selected}.short`).toLowerCase() : '' })}
          </h1>
        </div>

        {/* Phase selector */}
        <div className="flex flex-wrap gap-1.5">
          {PHASE_ORDER.map((id) => {
            const active = id === selected;
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectPhase(id)}
                className={`inline-flex items-center gap-1.5 rounded-full border-[0.5px] px-2.5 py-1.5 text-[12px] transition-colors ${
                  active ? 'border-ink bg-ink text-warm-50' : 'border-warm-300 bg-warm-50 text-ink hover:bg-warm-100'
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: PHASE_HEX[id] }} />
                {tPhases(`${id}.short`)}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="loading-shimmer h-40 rounded-[14px]" />
        ) : !hasContent ? (
          <p className="py-6 text-center text-[13.5px] leading-relaxed text-warm-500">{t('empty')}</p>
        ) : (
          <>
            {echo!.frequent.length > 0 && (
              <div className="hd-card">
                <div className="hd-caps mb-3 text-warm-500">{t('frequent_title')}</div>
                <div className="flex flex-col gap-2">
                  {echo!.frequent.map((f) => (
                    <FrequencyRow
                      key={f.pastille}
                      glyph={PASTILLE_GLYPHS[f.pastille as PastilleId] ?? '·'}
                      label={tJournal(`pastilles.${f.pastille}`)}
                      count={f.count}
                      total={f.total}
                    />
                  ))}
                </div>
              </div>
            )}

            {(echo!.helpful.length > 0 || echo!.not_helpful.length > 0) && (
              <div className="hd-card">
                <div className="hd-caps mb-3 text-warm-500">{t('loop_title')}</div>
                <div className="flex flex-col gap-2.5">
                  {echo!.helpful.map((h, i) => (
                    <EchoRow key={`h${i}`} tone="helpful" label={t('helped')} item={h} />
                  ))}
                  {echo!.not_helpful.map((h, i) => (
                    <EchoRow key={`n${i}`} tone="avoid" label={t('not_helped')} item={h} />
                  ))}
                </div>
              </div>
            )}

            {echo!.history.length > 0 && (
              <div className="hd-card">
                <div className="hd-caps mb-3 text-warm-500">{t('notes_title')}</div>
                {echo!.history.map((h, i) => (
                  <div
                    key={i}
                    className={`pb-3 ${i === 0 ? '' : 'pt-3'} ${
                      i < echo!.history.length - 1 ? 'border-b-[0.5px] border-warm-300' : ''
                    }`}
                  >
                    <div className="hd-meta mb-1 text-warm-400">
                      {monthLabel(h.cycle_start)} · J{h.day_from}–J{h.day_to}
                    </div>
                    {h.note && <p className="text-[13.5px] leading-relaxed text-ink-soft">« {h.note} »</p>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
