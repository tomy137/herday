import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import type { CalendarDay, PhaseInfo } from '../api/client';
import type { Phase } from '../lib/cycle-engine';
import { formatDate, today, monthKey } from '../lib/date-utils';
import { PHASE_ICONS } from '../constants/phases';
import { getEventIcon } from '../constants/event-types';

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const;

const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

const PHASE_LIST: Phase[] = ['menstruation', 'follicular', 'ovulation', 'luteal'];

const CELL_BG_ACTIVE: Record<Phase, string> = {
  menstruation: 'bg-[#DC3D5A]',
  follicular: 'bg-[#2DA87E]',
  ovulation: 'bg-[#F6E134]',
  luteal: 'bg-[#7E4FD0]',
};

const CELL_BG_INACTIVE: Record<Phase, string> = {
  menstruation: 'bg-[#DC3D5A]/15',
  follicular: 'bg-[#2DA87E]/5',
  ovulation: 'bg-[#D4880F]/5',
  luteal: 'bg-[#7E4FD0]/5',
};

const DARK_TEXT_PHASES = new Set<Phase>(['ovulation']);

const LEGEND_BG_INACTIVE: Record<Phase, string> = {
  menstruation: 'bg-[#DC3D5A]/8',
  follicular: 'bg-[#2DA87E]/8',
  ovulation: 'bg-[#D4880F]/8',
  luteal: 'bg-[#7E4FD0]/8',
};

/**
 * Compute phase start days from cycle parameters (Ogino method).
 */
function phaseStarts(cycleLength: number, periodDuration: number) {
  const ovulationDay = cycleLength - 14;
  return {
    menstruation: 1,
    follicular: periodDuration + 1,
    ovulation: ovulationDay - 2,
    luteal: ovulationDay + 3,
  };
}

/**
 * Days until a phase starts. Returns 0 if currently in that phase.
 */
function daysUntilPhase(
  dayInCycle: number,
  phaseStart: number,
  nextPhaseStart: number,
  cycleLength: number,
): number {
  if (nextPhaseStart > phaseStart) {
    if (dayInCycle >= phaseStart && dayInCycle < nextPhaseStart) return 0;
  } else {
    // Wrapping case: luteal -> menstruation
    if (dayInCycle >= phaseStart || dayInCycle < nextPhaseStart) return 0;
  }
  let diff = phaseStart - dayInCycle;
  if (diff <= 0) diff += cycleLength;
  return diff;
}

export default function Calendar() {
  const { t } = useTranslation('calendar');
  const { t: tCommon } = useTranslation('common');

  const now = today();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(true);
  const [phaseInfo, setPhaseInfo] = useState<PhaseInfo | null>(null);

  const fetchCalendar = async (y: number, m: number) => {
    setLoading(true);
    try {
      const key = monthKey(new Date(y, m, 1));
      const data = await api.phases.calendar(key);
      setDays(data.days);
      setHasData(data.days.some((d) => d.phase !== null));
    } catch {
      setDays([]);
      setHasData(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar(year, month);
  }, [year, month]);

  useEffect(() => {
    api.phases.today().then(setPhaseInfo).catch(() => {});
  }, []);

  const goToPrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const goToNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const offset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  const todayStr = formatDate(now);

  const cycleLen = phaseInfo?.cycle_length ?? 28;
  const dayInCycle = phaseInfo?.day_in_cycle ?? 0;
  const currentPhase = (phaseInfo?.phase as Phase | null) ?? null;
  const starts = phaseStarts(cycleLen, 5);
  const startsArr = [starts.menstruation, starts.follicular, starts.ovulation, starts.luteal];

  // Compute the set of dates in the active phase block (contiguous same-phase around today)
  const activeDates = new Set<string>();
  if (currentPhase && days.length > 0) {
    const todayIdx = days.findIndex((d) => d.date === todayStr);
    if (todayIdx >= 0) {
      activeDates.add(days[todayIdx].date);
      for (let i = todayIdx - 1; i >= 0; i--) {
        if (days[i].phase === currentPhase) activeDates.add(days[i].date);
        else break;
      }
      for (let i = todayIdx + 1; i < days.length; i++) {
        if (days[i].phase === currentPhase) activeDates.add(days[i].date);
        else break;
      }
    }
  }

  return (
    <div className="p-5">
      {/* Month header */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={goToPrev}
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-warm-100 text-warm-400 transition-all duration-200 active:scale-95"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
          {t(`months.${MONTH_KEYS[month]}`)} {year}
        </h2>
        <button
          onClick={goToNext}
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-warm-100 text-warm-400 transition-all duration-200 active:scale-95"
          aria-label="Next month"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-14 h-14 rounded-full loading-shimmer" />
          <p className="text-warm-400 text-sm font-medium">{tCommon('loading')}</p>
        </div>
      ) : (
        <div className="animate-fade-in-up">
          {/* Learning badge */}
          {!hasData && (
            <div className="mb-4 rounded-2xl bg-warm-100 border border-warm-200/60 p-4 text-center">
              <p className="text-sm font-semibold text-warm-500">{t('learning_badge')}</p>
              <p className="mt-1 text-xs text-warm-400">{t('learning_hint')}</p>
            </div>
          )}
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAY_KEYS.map((wd) => (
              <div key={wd} className="text-center text-[11px] font-semibold text-warm-400 uppercase tracking-wider py-1">
                {t(`weekdays.${wd}`)}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: offset }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {days.map((day) => {
              const dayNum = parseInt(day.date.split('-')[2], 10);
              const isToday = day.date === todayStr;
              const phase = day.phase as Phase | null;
              const isMenstruation = phase === 'menstruation';
              const hasPhase = phase !== null;
              const hasEvents = day.events.length > 0;

              const isActivePhase = activeDates.has(day.date);
              const cellBg = hasPhase
                ? (isActivePhase ? CELL_BG_ACTIVE[phase] : CELL_BG_INACTIVE[phase])
                : '';

              // Opacity based on confidence
              let opacity = '';
              if (hasPhase && day.confidence < 0.4) opacity = 'opacity-50';
              else if (hasPhase && day.confidence < 0.7) opacity = 'opacity-75';

              return (
                <div
                  key={day.date}
                  className={`aspect-square rounded-xl text-sm relative overflow-hidden transition-all duration-200
                    ${cellBg} ${opacity}
                    ${!hasPhase ? 'text-gray-700' : ''}
                    ${isMenstruation ? 'text-white' : ''}
                  `}
                >
                  {/* Day number watermark */}
                  <span className={`absolute inset-0 flex items-center justify-center text-[22px] pointer-events-none select-none ${
                    isToday ? 'text-white font-black' :
                    isActivePhase ? 'text-white/50 font-black' :
                    isMenstruation ? 'text-white/40 font-black' :
                    'text-gray-500/30 font-black'
                  }`}>
                    {dayNum}
                  </span>
                  {/* Event emojis top-left */}
                  {hasEvents && (
                    <div className="absolute inset-0 p-0.5 flex flex-wrap gap-0 content-start z-10">
                      {day.events.map((evt, i) => (
                        <span key={i} className="text-[9px] leading-tight">{getEventIcon(evt)}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Phase legend */}
          <div className="mt-8 space-y-2.5">
            {PHASE_LIST.map((phase, idx) => {
              const phaseStart = starts[phase as keyof typeof starts];
              const nextStart = startsArr[(idx + 1) % PHASE_LIST.length];
              const daysLeft = dayInCycle > 0
                ? daysUntilPhase(dayInCycle, phaseStart, nextStart, cycleLen)
                : -1;
              const isCurrent = daysLeft === 0;

              const legendBg = isCurrent
                ? CELL_BG_ACTIVE[phase]
                : LEGEND_BG_INACTIVE[phase];
              const isMens = phase === 'menstruation';
              const isDark = isCurrent && DARK_TEXT_PHASES.has(phase);
              const activeText = isDark ? 'text-gray-900' : 'text-white';
              const activeTextMuted = isDark ? 'text-gray-900/70' : 'text-white/90';
              const borderClass = isMens
                ? (isCurrent ? 'border-[#DC3D5A]/20' : 'border-[#DC3D5A]/10')
                : 'border-transparent';

              return (
                <div
                  key={phase}
                  className={`rounded-2xl p-3.5 border transition-all ${legendBg} ${borderClass}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{PHASE_ICONS[phase]}</span>
                    <span className={`text-[13px] font-bold ${isCurrent ? activeText : 'text-gray-800'}`}>
                      {t(`phases.${phase}.name`)}
                    </span>
                    <span className={`text-[11px] font-medium italic ${isCurrent ? activeTextMuted : 'text-gray-800'}`}>
                      — {t(`phases.${phase}.season`)}
                    </span>
                    {dayInCycle > 0 && (
                      <span className={`text-[11px] ml-auto tabular-nums ${
                        isCurrent
                          ? `${activeTextMuted} italic font-medium`
                          : (isMens ? 'text-[#DC3D5A]/50 font-bold' : 'text-warm-300 font-bold')
                      }`}>
                        {isCurrent ? 'en cours' : `J-${daysLeft}`}
                      </span>
                    )}
                  </div>
                  <p className={`text-[12px] leading-relaxed pl-5 ${isCurrent ? activeText : 'text-warm-500'}`}>
                    {t(`phases.${phase}.desc`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
