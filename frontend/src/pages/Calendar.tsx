// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import type { CalendarDay, PhaseInfo } from '../api/client';
import type { Phase } from '../lib/cycle-engine';
import { formatDate, today, monthKey, parseDate } from '../lib/date-utils';
import { PHASE_SOFT_HEX, PHASE_INK_HEX, PHASE_ZONE, ZONE_INK_HEX, withAlpha } from '../constants/phases';
import { PHASE_ORDER } from '../constants/phase-meta';
import Header from '../components/layout/Header';
import CycleGraph from '../components/CycleGraph';
import PhaseCard from '../components/home/PhaseCard';
import PhaseDetail from '../components/phase/PhaseDetail';

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const;
const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

/** Symbols for the key days, on top of the colour — readable without telling hues apart. */
const SYMBOLS = {
  drop: 'M12 3c3.5 4.5 6 8 6 11a6 6 0 0 1-12 0c0-3 2.5-6.5 6-11z',
  sun: 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 1v3M12 20v3M1 12h3M20 12h3',
  wave: 'M2 12c3-4 5-4 8 0s5 4 8 0 3-2 4-1',
} as const;
type SymbolKey = keyof typeof SYMBOLS;

function DaySymbol({ name, color, size = 10 }: { name: SymbolKey; color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ stroke: color }}>
      <path d={SYMBOLS[name]} />
    </svg>
  );
}

const SWIPE_MIN_PX = 50;

export default function Calendar() {
  const { t, i18n } = useTranslation('calendar');
  const { t: tCommon } = useTranslation('common');
  const { t: tPhases } = useTranslation('phases');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramPhase = searchParams.get('phase');
  const initialPhase =
    paramPhase && (PHASE_ORDER as readonly string[]).includes(paramPhase) ? (paramPhase as Phase) : null;

  const now = today();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(true);
  const [info, setInfo] = useState<PhaseInfo | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(initialPhase);
  const [selectedDay, setSelectedDay] = useState<string>(formatDate(now));
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    setLoading(true);
    api.phases.calendar(monthKey(new Date(year, month, 1)))
      .then((data) => {
        setDays(data.days);
        setHasData(data.days.some((d) => d.phase !== null));
      })
      .catch(() => { setDays([]); setHasData(false); })
      .finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => {
    api.phases.today().then(setInfo).catch(() => {});
  }, []);

  const goPrev = () => (month === 0 ? (setMonth(11), setYear(year - 1)) : setMonth(month - 1));
  const goNext = () => (month === 11 ? (setMonth(0), setYear(year + 1)) : setMonth(month + 1));

  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (dx > SWIPE_MIN_PX) goPrev();
    else if (dx < -SWIPE_MIN_PX) goNext();
  };

  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const todayStr = formatDate(now);
  const effectivePhase = selectedPhase ?? (info?.phase as Phase | undefined);
  const ovulationDay = (info?.cycle_length ?? 28) - 14;

  const symbolFor = (day: CalendarDay): SymbolKey | null => {
    if (day.phase === 'menstruation') return 'drop';
    if (day.phase === 'pre_menstrual') return 'wave';
    if (day.phase === 'ovulation' && day.day_in_cycle === ovulationDay) return 'sun';
    return null;
  };

  const selected = days.find((d) => d.date === selectedDay) ?? null;
  const selectedPhaseOfDay = (selected?.phase as Phase | null) ?? null;
  const selectedLabel = new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })
    .format(parseDate(selectedDay))
    .replace(/^\w/, (c) => c.toUpperCase());

  const legend: { phase: Phase; symbol: SymbolKey | null; label: string }[] = [
    { phase: 'menstruation', symbol: 'drop', label: tPhases('menstruation.short') },
    { phase: 'pre_menstrual', symbol: 'wave', label: tPhases('pre_menstrual.short') },
    { phase: 'post_menstrual', symbol: null, label: tPhases('post_menstrual.short') },
    { phase: 'ovulation', symbol: 'sun', label: t('legend_ovulation') },
    { phase: 'pre_ovulatory', symbol: null, label: tPhases('pre_ovulatory.short') },
    { phase: 'post_ovulatory', symbol: null, label: tPhases('post_ovulatory.short') },
  ];

  return (
    <div>
      <Header rightLabel={tCommon('nav.calendar').toUpperCase()} />
      <div className="flex flex-col gap-4 px-5 pb-6 pt-2">
        {/* Month nav */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goPrev}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-warm-300 bg-warm-100 text-[22px] leading-none text-ink transition-all duration-150 active:scale-[0.94]"
            aria-label={t('prev_month')}
          >
            ‹
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-[22px] font-bold text-ink">
              {t(`months.${MONTH_KEYS[month]}`)} {year}
            </h1>
            <span className="text-[11px] text-warm-500">{t('swipe_hint')}</span>
          </div>
          <button
            type="button"
            onClick={goNext}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-warm-300 bg-warm-100 text-[22px] leading-none text-ink transition-all duration-150 active:scale-[0.94]"
            aria-label={t('next_month')}
          >
            ›
          </button>
        </div>

        {loading ? (
          <div className="loading-shimmer h-72 rounded-[14px]" />
        ) : (
          <>
            {!hasData && (
              <div className="rounded-[14px] border border-warm-300 bg-warm-100 p-4 text-center">
                <p className="text-[13px] font-medium text-warm-500">{t('learning_badge')}</p>
              </div>
            )}

            <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="flex flex-col gap-1">
              {/* Weekday header */}
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAY_KEYS.map((wd) => (
                  <div key={wd} className="hd-meta py-1 text-center text-warm-500">
                    {t(`weekdays.${wd}`).slice(0, 1)}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: offset }).map((_, i) => (
                  <div key={`e${i}`} style={{ aspectRatio: '1 / 1.1' }} />
                ))}
                {days.map((day, i) => {
                  const phase = day.phase as Phase | null;
                  const isToday = day.date === todayStr;
                  const isSelected = day.date === selectedDay;
                  const dimmed = selectedPhase && phase !== selectedPhase;
                  const dom = parseInt(day.date.split('-')[2], 10);
                  const bg = phase ? PHASE_SOFT_HEX[phase] : 'transparent';
                  const ink = phase ? PHASE_INK_HEX[phase] : 'var(--color-warm-500)';
                  // J only on the first day of each phase.
                  const firstOfPhase = phase && (i === 0 || days[i - 1].phase !== phase || day.day_in_cycle === 1);
                  const symbol = symbolFor(day);
                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => setSelectedDay(day.date)}
                      aria-pressed={isSelected}
                      aria-label={`${dom}${phase ? ` · ${tPhases(`${phase}.short`)}` : ''}${day.has_journal ? ` · ${t('noted')}` : ''}`}
                      className="relative flex flex-col items-center justify-center gap-0.5 rounded-[10px] transition-opacity"
                      style={{
                        aspectRatio: '1 / 1.1',
                        background: bg,
                        color: ink,
                        border: isToday
                          ? '2px solid var(--color-ink)'
                          : isSelected
                            ? `1.5px solid ${ink}`
                            : '1px solid transparent',
                        opacity: dimmed ? 0.35 : 1,
                      }}
                    >
                      {symbol && (
                        <span className="absolute left-1 top-1"><DaySymbol name={symbol} color={ink} /></span>
                      )}
                      {day.has_journal && (
                        <span className="absolute right-1.5 top-1.5 h-1 w-1 rounded-full" style={{ background: ink }} />
                      )}
                      <span className="text-[14px] leading-none" style={{ fontWeight: isToday ? 700 : 400 }}>{dom}</span>
                      {firstOfPhase && day.day_in_cycle != null && (
                        <span className="hd-meta font-bold leading-none" style={{ fontSize: '9px' }}>J{day.day_in_cycle}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {legend.map((l) => (
                <button
                  key={l.phase}
                  type="button"
                  onClick={() => setSelectedPhase(l.phase === selectedPhase ? null : l.phase)}
                  aria-pressed={selectedPhase === l.phase}
                  className="flex min-h-[28px] items-center gap-2 text-left text-[12px] text-ink-soft"
                  style={{ opacity: selectedPhase && selectedPhase !== l.phase ? 0.4 : 1 }}
                >
                  <span
                    className="inline-flex h-4 w-5 items-center justify-center rounded-[4px]"
                    style={{ background: PHASE_SOFT_HEX[l.phase], border: `1px solid ${withAlpha(PHASE_INK_HEX[l.phase], 0.25)}` }}
                  >
                    {l.symbol && <DaySymbol name={l.symbol} color={PHASE_INK_HEX[l.phase]} />}
                  </span>
                  {l.label}
                </button>
              ))}
            </div>

            {/* Selected day */}
            <div className="flex flex-col gap-2.5 rounded-[20px] bg-warm-100 px-4 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[15px] font-bold text-ink">{selectedLabel}</div>
                {selectedPhaseOfDay && selected?.day_in_cycle != null && (
                  <span
                    className="rounded-[10px] px-2.5 py-1 text-[11px] font-bold"
                    style={{ background: ZONE_INK_HEX[PHASE_ZONE[selectedPhaseOfDay]], color: 'var(--color-on-accent)' }}
                  >
                    {tPhases(`zones.${PHASE_ZONE[selectedPhaseOfDay]}`)} · J{selected.day_in_cycle}
                  </span>
                )}
              </div>
              {selectedPhaseOfDay && (
                <div className="text-[13px] text-ink-soft">{tPhases(`${selectedPhaseOfDay}.short`)}</div>
              )}
              {selectedDay <= todayStr && (
                <button
                  type="button"
                  onClick={() => navigate(`/journal?date=${selectedDay}`)}
                  className="min-h-[44px] rounded-[12px] bg-ink text-[14px] font-bold text-warm-50"
                >
                  {selected?.has_journal ? t('edit_note_day') : t('note_day')}
                </button>
              )}
            </div>

            {/* Complete card of the selected (or current) phase, then the science */}
            {effectivePhase && info && (
              <>
                <PhaseCard phase={effectivePhase} info={info} />
                <div className="rounded-[20px] bg-warm-100 px-2 pb-2 pt-3.5">
                  <CycleGraph
                    dayInCycle={info.day_in_cycle}
                    cycleLength={info.cycle_length}
                    phase={effectivePhase}
                    onSelectPhase={setSelectedPhase}
                  />
                </div>
                <PhaseDetail phase={effectivePhase} />
                <button
                  type="button"
                  onClick={() => navigate(`/echoes?phase=${effectivePhase}`)}
                  className="hd-card flex min-h-[52px] items-center justify-between text-left"
                >
                  <span className="text-[15px] text-ink">{t('see_echoes')}</span>
                  <span className="text-warm-500">→</span>
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
