// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { PhaseInfo, EchoAggregate } from '../api/client';
import type { Phase } from '../lib/cycle-engine';
import { PHASE_RANGES_28 } from '../constants/phase-meta';
import { syncPhaseToWidget } from '../native/widgetBridge';
import Header from '../components/layout/Header';
import PhaseCard from '../components/home/PhaseCard';
import EchoCard from '../components/home/EchoCard';
import CycleGraph from '../components/CycleGraph';
import BottomSheet from '../components/ui/BottomSheet';
import { useToast } from '../components/ui/Toast';
import { formatDate, today, yesterday } from '../lib/date-utils';

export default function Home() {
  const { t: tCommon } = useTranslation('common');
  const { t: tPhases } = useTranslation('phases');
  const { t: tJournal } = useTranslation('journal');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [info, setInfo] = useState<PhaseInfo | null>(null);
  const [echo, setEcho] = useState<EchoAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [customDate, setCustomDate] = useState(formatDate(today()));
  const [submitting, setSubmitting] = useState(false);

  const syncWidget = useCallback((phaseInfo: PhaseInfo, echoes: EchoAggregate | null) => {
    const phase = phaseInfo.phase as Phase;
    const posture = tPhases(`${phase}.posture`, { returnObjects: true }) as string[];
    const band = PHASE_RANGES_28[phase];
    const span = Math.max(1, band.to - band.from + 1);
    const idx = Math.min(span, Math.max(1, span - (phaseInfo.phase_ends_in ?? 1) + 1));
    void syncPhaseToWidget({
      phase: phaseInfo.system_state === 'unknown' ? 'unknown' : phaseInfo.phase,
      phaseLabel: tPhases(`${phase}.short`),
      dayInCycle: phaseInfo.day_in_cycle,
      cycleLength: phaseInfo.cycle_length,
      nextPeriodIn: phaseInfo.next_period_in,
      phaseEndsIn: phaseInfo.phase_ends_in,
      tipTitle: posture.slice(0, 3).join(' · '),
      tipBody: tPhases(`${phase}.bio`),
      systemState: phaseInfo.system_state,
      posture,
      range: tPhases(`${phase}.range`),
      phaseSpan: span,
      phaseDayIdx: idx,
      echoHelpful: echoes?.helpful[0] ?? null,
    });
  }, [tPhases]);

  const load = useCallback(async () => {
    try {
      const [phaseInfo, echoes] = await Promise.all([
        api.phases.today(),
        api.echoes.current().catch(() => null),
      ]);
      setInfo(phaseInfo);
      setEcho(echoes);
      setError(false);
      syncWidget(phaseInfo, echoes);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [syncWidget]);

  useEffect(() => {
    load();
  }, [load]);

  const declarePeriod = async (dateStr: string) => {
    setSubmitting(true);
    try {
      await api.events.create({ event_type: 'period_started', event_date: dateStr, confidence: 1.0 });
      showToast(tCommon('period.saved'));
      setPeriodOpen(false);
      setShowPicker(false);
      await load();
    } catch {
      showToast(tCommon('error'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <div className="loading-shimmer h-16 w-16 rounded-full" />
        <p className="text-sm font-medium text-warm-400">{tCommon('loading')}</p>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="font-medium text-phase-menstruation">{tCommon('error')}</p>
      </div>
    );
  }

  const phase = info.phase as Phase;
  const isUnknown = info.system_state === 'unknown';

  return (
    <div>
      <Header />
      {isUnknown ? (
        <div className="flex flex-col gap-[18px] px-[22px] pb-6 pt-8">
          <div className="rounded-[14px] border-[0.5px] border-warm-300 bg-warm-100 px-5 py-9 text-center">
            <h2 className="text-[18px] font-semibold text-ink">{tPhases('empty.title')}</h2>
            <p className="mx-auto mt-2 max-w-[18rem] text-[14px] leading-relaxed text-warm-500">
              {tPhases('empty.body')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPeriodOpen(true)}
            className="rounded-[10px] bg-ink px-5 py-3.5 text-[14px] font-medium text-warm-50 transition-all hover:bg-ink-soft active:scale-[0.99]"
          >
            {tCommon('period.declare')}
          </button>
        </div>
      ) : (
      <div className="flex flex-col gap-[18px] px-[22px] pb-6 pt-1">
        <div className="rounded-[14px] bg-warm-100 px-2 pb-2 pt-3.5">
          <CycleGraph dayInCycle={info.day_in_cycle} cycleLength={info.cycle_length} phase={phase} />
        </div>

        <PhaseCard phase={phase} info={info} />

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => navigate('/journal')}
            className="rounded-[10px] bg-ink px-5 py-3.5 text-[14px] font-medium text-warm-50 transition-all hover:bg-ink-soft active:scale-[0.99]"
          >
            {tJournal('cta')}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/calendar?phase=${phase}`)}
            className="rounded-[10px] bg-warm-200 px-5 py-3.5 text-[14px] font-medium text-ink transition-all hover:bg-warm-300 active:scale-[0.99]"
          >
            {tPhases('labels.more_details')}
          </button>
          <button
            type="button"
            onClick={() => setPeriodOpen(true)}
            className="text-[12px] text-warm-500 transition-colors hover:text-ink"
          >
            {tCommon('period.declare')} →
          </button>
        </div>

        {echo && <EchoCard echo={echo} onSeeAll={() => navigate('/echoes')} />}
      </div>
      )}

      <BottomSheet
        open={periodOpen}
        onClose={() => { setPeriodOpen(false); setShowPicker(false); }}
        title={tCommon('period.title')}
      >
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => declarePeriod(formatDate(today()))}
            disabled={submitting}
            className="rounded-[10px] bg-ink px-5 py-3 text-[14px] font-medium text-warm-50 disabled:opacity-50"
          >
            {tCommon('dates.today')}
          </button>
          <button
            type="button"
            onClick={() => declarePeriod(formatDate(yesterday()))}
            disabled={submitting}
            className="rounded-[10px] border-[0.5px] border-warm-300 px-5 py-3 text-[14px] font-medium text-ink transition-colors hover:bg-warm-100 disabled:opacity-50"
          >
            {tCommon('dates.yesterday')}
          </button>
          {!showPicker ? (
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="rounded-[10px] bg-warm-100 px-5 py-3 text-[14px] font-medium text-warm-500 transition-colors hover:bg-warm-200"
            >
              {tCommon('dates.choose_date')}
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="date"
                value={customDate}
                max={formatDate(today())}
                onChange={(e) => setCustomDate(e.target.value)}
                className="flex-1 rounded-[10px] border-[0.5px] border-warm-300 bg-warm-50 px-3.5 py-3 text-[14px] text-ink outline-none transition-colors focus:border-ink"
              />
              <button
                type="button"
                onClick={() => declarePeriod(customDate)}
                disabled={submitting}
                className="rounded-[10px] bg-ink px-5 py-3 text-[14px] font-medium text-warm-50 disabled:opacity-50"
              >
                {tCommon('actions.confirm')}
              </button>
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
