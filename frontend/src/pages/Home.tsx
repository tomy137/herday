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
import GoFurther from '../components/home/GoFurther';
import CycleGraph from '../components/CycleGraph';

export default function Home() {
  const { t: tCommon } = useTranslation('common');
  const { t: tPhases } = useTranslation('phases');
  const { t: tJournal } = useTranslation('journal');
  const navigate = useNavigate();

  const [info, setInfo] = useState<PhaseInfo | null>(null);
  const [echo, setEcho] = useState<EchoAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

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

  return (
    <div>
      <Header />
      <div className="flex flex-col gap-[18px] px-[22px] pb-6 pt-1">
        <div className="rounded-[14px] bg-warm-100 px-2 pb-2 pt-3.5">
          <CycleGraph dayInCycle={info.day_in_cycle} cycleLength={info.cycle_length} phase={phase} />
        </div>

        <PhaseCard info={info} />

        <button
          type="button"
          onClick={() => navigate('/journal')}
          className="rounded-[10px] bg-ink px-5 py-3.5 text-[14px] font-medium text-warm-50 transition-all hover:bg-ink-soft active:scale-[0.99]"
        >
          {tJournal('cta')}
        </button>

        {echo && <EchoCard echo={echo} onSeeAll={() => navigate('/echoes')} />}

        <GoFurther phase={phase} />
      </div>
    </div>
  );
}
