// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { CalendarDay, PhaseInfo } from '../api/client';
import type { Phase } from '../lib/cycle-engine';
import { formatDate, today, monthKey } from '../lib/date-utils';
import { PHASE_SOFT_HEX, PHASE_INK_HEX, PHASE_ICONS } from '../constants/phases';
import { PHASE_ORDER } from '../constants/phase-meta';
import Header from '../components/layout/Header';
import CycleGraph from '../components/CycleGraph';
import PhaseCard from '../components/home/PhaseCard';
import GoFurther from '../components/home/GoFurther';

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const;
const WEEKDAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export default function Calendar() {
  const { t } = useTranslation('calendar');
  const { t: tCommon } = useTranslation('common');
  const { t: tPhases } = useTranslation('phases');
  const navigate = useNavigate();

  const now = today();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(true);
  const [info, setInfo] = useState<PhaseInfo | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);

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

  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const todayStr = formatDate(now);
  const effectivePhase = selectedPhase ?? (info?.phase as Phase | undefined);

  return (
    <div>
      <Header rightLabel={tCommon('nav.calendar').toUpperCase()} />
      <div className="flex flex-col gap-[18px] px-[22px] pb-6 pt-2">
        {/* Month nav */}
        <div className="flex items-center justify-between">
          <button type="button" onClick={goPrev} className="-ml-2 px-2 py-1.5 text-warm-400 hover:text-ink" aria-label="prev">‹</button>
          <h2 className="text-[20px] font-normal text-ink">
            {t(`months.${MONTH_KEYS[month]}`)} {year}
          </h2>
          <button type="button" onClick={goNext} className="-mr-2 px-2 py-1.5 text-warm-400 hover:text-ink" aria-label="next">›</button>
        </div>

        {/* Hormone graph — highlights the selected phase (click a band or the legend) */}
        <div className="rounded-[14px] bg-warm-100 px-2 pb-2 pt-3.5">
          <CycleGraph
            dayInCycle={info?.day_in_cycle ?? 0}
            cycleLength={info?.cycle_length ?? 28}
            phase={selectedPhase ?? (info?.phase as Phase | undefined) ?? null}
            onSelectPhase={setSelectedPhase}
          />
        </div>

        {loading ? (
          <div className="loading-shimmer h-72 rounded-[14px]" />
        ) : (
          <>
            {!hasData && (
              <div className="rounded-[14px] border-[0.5px] border-warm-300 bg-warm-100 p-4 text-center">
                <p className="text-[13px] font-medium text-warm-500">{t('learning_badge')}</p>
              </div>
            )}

            {/* Weekday header */}
            <div className="grid grid-cols-7 gap-1">
              {WEEKDAY_KEYS.map((wd) => (
                <div key={wd} className="hd-meta py-1.5 text-center text-warm-400">
                  {t(`weekdays.${wd}`).slice(0, 1)}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: offset }).map((_, i) => (
                <div key={`e${i}`} style={{ aspectRatio: '1 / 1.05' }} />
              ))}
              {days.map((day) => {
                const phase = day.phase as Phase | null;
                const isToday = day.date === todayStr;
                const dimmed = selectedPhase && phase !== selectedPhase;
                const dom = parseInt(day.date.split('-')[2], 10);
                const bg = phase ? PHASE_SOFT_HEX[phase] : 'transparent';
                const ink = phase ? PHASE_INK_HEX[phase] : 'var(--color-warm-400)';
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => phase && setSelectedPhase(phase === selectedPhase ? null : phase)}
                    disabled={!phase}
                    className="relative flex flex-col items-center justify-between rounded-lg px-1 pb-1 pt-1.5 transition-opacity"
                    style={{
                      aspectRatio: '1 / 1.05',
                      background: bg,
                      border: isToday ? '1px solid var(--color-ink)' : '0.5px solid transparent',
                      opacity: dimmed ? 0.35 : 1,
                    }}
                  >
                    {day.has_journal && (
                      <span
                        className="absolute right-1 top-1 h-1 w-1 rounded-full"
                        style={{ background: phase ? ink : 'var(--color-ink)', opacity: 0.55 }}
                        aria-label="observation notée"
                      />
                    )}
                    <span
                      className="text-[13px]"
                      style={{ color: isToday ? 'var(--color-ink)' : ink, fontWeight: isToday ? 500 : 400 }}
                    >
                      {dom}
                    </span>
                    {day.day_in_cycle != null && (
                      <span className="hd-meta" style={{ color: ink, opacity: 0.7, fontSize: '8px' }}>
                        J{day.day_in_cycle}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="hd-card-flat">
              <div className="hd-caps mb-2.5 text-warm-500">{t('legend_title', { defaultValue: 'Légende des phases' })}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {PHASE_ORDER.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedPhase(id === selectedPhase ? null : id)}
                    className="flex items-center gap-1.5 text-left text-[11.5px]"
                    style={{ opacity: selectedPhase && selectedPhase !== id ? 0.4 : 1 }}
                  >
                    <span
                      className="inline-block h-3 w-3 rounded-[2px]"
                      style={{ background: PHASE_SOFT_HEX[id], border: `0.5px solid ${PHASE_INK_HEX[id]}40` }}
                    />
                    <span className="text-ink-soft">{PHASE_ICONS[id]} {tPhases(`${id}.short`)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Complete card of the selected (or current) phase */}
            {effectivePhase && info && (
              <>
                <PhaseCard phase={effectivePhase} info={info} />
                <GoFurther phase={effectivePhase} />
                <button
                  type="button"
                  onClick={() => navigate(`/echoes?phase=${effectivePhase}`)}
                  className="hd-card flex items-center justify-between text-left"
                >
                  <span className="text-[15.5px] text-ink">{t('see_echoes')}</span>
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
