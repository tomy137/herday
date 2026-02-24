import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import type { PhaseInfo } from '../api/client';
import type { Phase } from '../lib/cycle-engine';
import { formatDate, today, yesterday } from '../lib/date-utils';
import { PHASE_COLORS, PHASE_ICONS } from '../constants/phases';
import { EVENT_TYPES } from '../constants/event-types';
import BottomSheet from '../components/ui/BottomSheet';
import ConfidenceBadge from '../components/ui/ConfidenceBadge';
import { useToast } from '../components/ui/Toast';

type SheetMode = 'period' | 'observe' | 'info' | null;
type InfoStep = 'choose' | 'first_day_date' | 'cycle_length';

const EDUCATION_KEYS = ['cycle_average', 'phases_exist', 'track_helps'] as const;
const MOOD_TYPES = EVENT_TYPES.filter((et) => et.category === 'mood');

export default function Home() {
  const { t } = useTranslation('dashboard');
  const { t: tEvents } = useTranslation('events');
  const { t: tTips } = useTranslation('tips');
  const { t: tCommon } = useTranslation('common');
  const { showToast } = useToast();

  const [phaseInfo, setPhaseInfo] = useState<PhaseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sheetMode, setSheetMode] = useState<SheetMode>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDate, setCustomDate] = useState(formatDate(today()));
  const [submitting, setSubmitting] = useState(false);

  // Period sheet state
  const [periodStep, setPeriodStep] = useState<'when' | 'first_day'>('when');
  const [periodDate, setPeriodDate] = useState('');

  // Observe sheet state
  const [observeStep, setObserveStep] = useState<'what' | 'when'>('what');
  const [observeMood, setObserveMood] = useState('');

  // Info sheet state
  const [infoStep, setInfoStep] = useState<InfoStep>('choose');
  const [infoDays, setInfoDays] = useState('');

  const fetchPhase = async () => {
    try {
      const data = await api.phases.today();
      setPhaseInfo(data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhase();
  }, []);

  const randomEducation = useMemo(() => {
    const idx = Math.floor(Math.random() * EDUCATION_KEYS.length);
    return EDUCATION_KEYS[idx];
  }, []);

  const isUnknown = !phaseInfo || phaseInfo.system_state === 'unknown';
  const phase = phaseInfo?.phase as Phase | undefined;
  const isPastPeriodDate = periodDate !== formatDate(today());

  // --- Helpers ---

  const resetSheets = () => {
    setSheetMode(null);
    setShowDatePicker(false);
    setPeriodStep('when');
    setPeriodDate('');
    setObserveStep('what');
    setObserveMood('');
    setInfoStep('choose');
    setInfoDays('');
  };

  const createEvent = async (eventType: string, eventDate: string, metadata?: Record<string, unknown>, confidence?: number) => {
    setSubmitting(true);
    try {
      await api.events.create({ event_type: eventType, event_date: eventDate, metadata, confidence });
      showToast(tEvents('success'));
      resetSheets();
      await fetchPhase();
    } catch {
      showToast(tCommon('error'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Period handlers ---

  const handlePeriodDate = (date: string) => {
    setPeriodDate(date);
    setPeriodStep('first_day');
  };

  const handleFirstDayAnswer = (answer: 'yes' | 'no' | 'unknown') => {
    const eventType = answer === 'no' ? 'period_ongoing' : 'period_started';
    const confidence = answer === 'unknown' ? 0.5 : 1.0;
    createEvent(eventType, periodDate, undefined, confidence);
  };

  // --- Observe handlers ---

  const handleObserveMood = (moodType: string) => {
    setObserveMood(moodType);
    setObserveStep('when');
  };

  const handleObserveDate = (date: string) => {
    createEvent(observeMood, date);
  };

  // --- Info handlers ---

  const handleInfoFirstDay = (date: string) => {
    createEvent('period_started', date, undefined, 0.8);
  };

  const handleCycleLength = () => {
    const days = parseInt(infoDays, 10);
    if (isNaN(days) || days < 15 || days > 50) return;
    createEvent('cycle_length_info', formatDate(today()), { cycle_length: days });
  };

  // --- Date picker block (reusable) ---

  const renderDatePicker = (onSelect: (date: string) => void) => (
    <div className="space-y-3">
      <button
        onClick={() => onSelect(formatDate(today()))}
        disabled={submitting}
        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#DC3D5A] to-[#E8647D] text-white font-semibold shadow-sm hover:shadow-md disabled:opacity-50 transition-all duration-200 active:scale-[0.98]"
      >
        {tCommon('dates.today')}
      </button>
      <button
        onClick={() => onSelect(formatDate(yesterday()))}
        disabled={submitting}
        className="w-full py-3.5 rounded-2xl bg-[#DC3D5A]/8 text-[#DC3D5A] font-semibold hover:bg-[#DC3D5A]/15 disabled:opacity-50 transition-all duration-200 active:scale-[0.98]"
      >
        {tCommon('dates.yesterday')}
      </button>
      {!showDatePicker ? (
        <button
          onClick={() => setShowDatePicker(true)}
          className="w-full py-3.5 rounded-2xl bg-warm-100 text-warm-500 font-semibold hover:bg-warm-200 transition-all duration-200 active:scale-[0.98]"
        >
          {tCommon('dates.choose_date')}
        </button>
      ) : (
        <div className="flex gap-2 animate-fade-in-up">
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            max={formatDate(today())}
            className="flex-1 px-4 py-3.5 rounded-2xl border border-warm-200 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#DC3D5A]/30 focus:border-[#DC3D5A]/40 transition-all"
          />
          <button
            onClick={() => onSelect(customDate)}
            disabled={submitting}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#DC3D5A] to-[#E8647D] text-white font-semibold shadow-sm disabled:opacity-50 transition-all duration-200 active:scale-[0.98]"
          >
            {tCommon('actions.confirm')}
          </button>
        </div>
      )}
    </div>
  );

  // --- Render ---

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-16 h-16 rounded-full loading-shimmer" />
        <p className="text-warm-400 text-sm font-medium">{tCommon('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-[#DC3D5A] font-medium">{tCommon('error')}</p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-6">
      {isUnknown ? (
        <>
          {/* Learning phase indicator */}
          <div className="flex flex-col items-center pt-8 pb-2 animate-scale-in">
            <div className="relative w-44 h-44 rounded-full flex flex-col items-center justify-center text-center bg-warm-100 border-[3px] border-warm-200/60">
              <span className="text-3xl mb-2">🕵️</span>
              <span className="text-[15px] font-bold text-warm-500 leading-tight px-5">
                {t('learning.title')}
              </span>
              <span className="text-[10px] text-warm-400 mt-1 leading-snug px-6">
                {t('learning.subtitle')}
              </span>
            </div>
          </div>

          {/* Learning hint */}
          <div className="rounded-2xl bg-warm-100 border border-warm-200/60 p-4 text-center animate-fade-in-up">
            <p className="text-sm text-warm-500 leading-relaxed">
              {t('learning.hint')}
            </p>
          </div>

          {/* Action buttons */}
          <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <button
              onClick={() => setSheetMode('period')}
              className="w-full py-5 rounded-2xl bg-[#DC3D5A]/6 border border-[#DC3D5A]/15 text-[#DC3D5A] font-semibold text-[17px] hover:bg-[#DC3D5A]/12 transition-all duration-200 active:scale-[0.98]"
            >
              {t('actions.period_started')}
            </button>
            <button
              onClick={() => setSheetMode('info')}
              className="w-full py-5 rounded-2xl bg-[#3B82F6]/6 border border-[#3B82F6]/15 text-[#3B82F6] font-semibold text-[17px] hover:bg-[#3B82F6]/12 transition-all duration-200 active:scale-[0.98]"
            >
              {t('actions.give_info')}
            </button>
            <button
              onClick={() => setSheetMode('observe')}
              className="w-full py-5 rounded-2xl bg-[#7E4FD0]/6 border border-[#7E4FD0]/15 text-[#7E4FD0] font-semibold text-[17px] hover:bg-[#7E4FD0]/12 transition-all duration-200 active:scale-[0.98]"
            >
              {t('actions.observe_change')}
            </button>
          </div>

          {/* Education card */}
          <div
            className="bg-warm-100 rounded-2xl p-5 border border-warm-200/60 animate-fade-in-up"
            style={{ animationDelay: '200ms' }}
          >
            <h3 className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2">
              {t('did_you_know')}
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              {t(`education.${randomEducation}`)}
            </p>
          </div>
        </>
      ) : (
        <>
          {/* Phase circle */}
          {phase && (
            <div className="flex flex-col items-center pt-8 pb-2 animate-scale-in">
              <div className="relative">
                {/* Outer glow ring */}
                <div
                  className={`absolute -inset-3 rounded-full bg-gradient-to-br ${PHASE_COLORS[phase].gradient} opacity-10 blur-xl`}
                />
                {/* Main circle */}
                <div
                  className={`relative w-44 h-44 rounded-full flex flex-col items-center justify-center ${PHASE_COLORS[phase].light} border-[3px] ${PHASE_COLORS[phase].border}`}
                  style={{ borderColor: `color-mix(in srgb, currentColor 20%, transparent)` }}
                >
                  <span className="text-3xl mb-1">{PHASE_ICONS[phase]}</span>
                  <span className={`text-[28px] font-bold ${PHASE_COLORS[phase].text} leading-none`}>
                    {t('phase.day_in_cycle', { day: phaseInfo.day_in_cycle })}
                  </span>
                  <span className={`text-sm font-medium ${PHASE_COLORS[phase].text} mt-1 opacity-75`}>
                    {t(`phase.${phaseInfo.phase}`)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Next period prediction */}
          {phaseInfo.next_period_in != null && (
            <div className="text-center space-y-3 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              <p className="text-warm-500 text-[15px] font-medium">
                {t('phase.next_period', { days: phaseInfo.next_period_in })}
              </p>
              <div className="flex justify-center">
                <ConfidenceBadge
                  confidence={phaseInfo.confidence}
                  systemState={phaseInfo.system_state}
                />
              </div>
            </div>
          )}

          {/* Phase tips card */}
          {phase && (
            <div
              className={`rounded-2xl p-5 ${PHASE_COLORS[phase].light} border ${PHASE_COLORS[phase].border} animate-fade-in-up`}
              style={{ animationDelay: '250ms' }}
            >
              {/* Season & role header */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-bold ${PHASE_COLORS[phase].text} uppercase tracking-wider`}>
                  {tTips(`${phase}.season`)}
                </span>
                <span className="text-warm-300">—</span>
                <span className="text-xs font-semibold text-gray-700 italic">
                  {tTips(`${phase}.role`)}
                </span>
              </div>

              {/* Bio */}
              <p className="text-sm text-gray-700 leading-relaxed mb-3">
                {tTips(`${phase}.bio`)}
              </p>

              {/* Action & attitude */}
              <div className="space-y-2 mb-3">
                <div className="flex gap-2">
                  <span className="text-sm shrink-0">👉</span>
                  <p className="text-sm text-gray-700 leading-relaxed">{tTips(`${phase}.action`)}</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-sm shrink-0">💡</span>
                  <p className="text-sm text-warm-500 leading-relaxed">{tTips(`${phase}.attitude`)}</p>
                </div>
              </div>

              {/* Avoid */}
              <div className="flex gap-2 rounded-xl bg-[#DC3D5A]/6 px-3 py-2.5">
                <span className="text-sm shrink-0">⛔</span>
                <p className="text-xs text-[#DC3D5A]/80 leading-relaxed font-medium">
                  {tTips(`${phase}.avoid`)}
                </p>
              </div>
            </div>
          )}

          {/* Quick action bar */}
          <div className="grid grid-cols-3 gap-2 pt-1 animate-fade-in-up" style={{ animationDelay: '350ms' }}>
            <button
              onClick={() => setSheetMode('period')}
              className="py-3.5 rounded-2xl bg-[#DC3D5A]/6 border border-[#DC3D5A]/12 text-[#DC3D5A] text-xs font-semibold hover:bg-[#DC3D5A]/12 transition-all duration-200 active:scale-[0.96]"
            >
              {t('actions.period_started')}
            </button>
            <button
              onClick={() => setSheetMode('info')}
              className="py-3.5 rounded-2xl bg-[#3B82F6]/6 border border-[#3B82F6]/12 text-[#3B82F6] text-xs font-semibold hover:bg-[#3B82F6]/12 transition-all duration-200 active:scale-[0.96]"
            >
              {t('actions.give_info')}
            </button>
            <button
              onClick={() => setSheetMode('observe')}
              className="py-3.5 rounded-2xl bg-[#7E4FD0]/6 border border-[#7E4FD0]/12 text-[#7E4FD0] text-xs font-semibold hover:bg-[#7E4FD0]/12 transition-all duration-200 active:scale-[0.96]"
            >
              {t('actions.observe_change')}
            </button>
          </div>
        </>
      )}

      {/* Period BottomSheet */}
      <BottomSheet
        open={sheetMode === 'period'}
        onClose={resetSheets}
        title={periodStep === 'when'
          ? tEvents('period.started')
          : tEvents(isPastPeriodDate ? 'period.first_day_question_past' : 'period.first_day_question')
        }
      >
        {periodStep === 'when' ? (
          renderDatePicker(handlePeriodDate)
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => handleFirstDayAnswer('yes')}
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#DC3D5A] to-[#E8647D] text-white font-semibold shadow-sm disabled:opacity-50 transition-all duration-200 active:scale-[0.98]"
            >
              {tEvents(isPastPeriodDate ? 'period.first_day_yes_past' : 'period.first_day_yes')}
            </button>
            <button
              onClick={() => handleFirstDayAnswer('no')}
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-[#DC3D5A]/8 text-[#DC3D5A] font-semibold hover:bg-[#DC3D5A]/15 disabled:opacity-50 transition-all duration-200 active:scale-[0.98]"
            >
              {tEvents(isPastPeriodDate ? 'period.first_day_no_past' : 'period.first_day_no')}
            </button>
            <button
              onClick={() => handleFirstDayAnswer('unknown')}
              disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-warm-100 text-warm-500 font-semibold hover:bg-warm-200 disabled:opacity-50 transition-all duration-200 active:scale-[0.98]"
            >
              {tEvents('period.first_day_unknown')}
            </button>
          </div>
        )}
      </BottomSheet>

      {/* Observe BottomSheet */}
      <BottomSheet
        open={sheetMode === 'observe'}
        onClose={resetSheets}
        title={observeStep === 'what' ? tEvents('observe.title') : tEvents('observe.since_when')}
      >
        {observeStep === 'what' ? (
          <div className="space-y-3">
            {MOOD_TYPES.map((mood) => (
              <button
                key={mood.type}
                onClick={() => handleObserveMood(mood.type)}
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-[#7E4FD0]/6 text-[#7E4FD0] font-semibold hover:bg-[#7E4FD0]/12 disabled:opacity-50 transition-all duration-200 text-left px-5 active:scale-[0.98]"
              >
                {mood.icon} {tEvents(mood.labelKey.replace('events:', ''))}
              </button>
            ))}
          </div>
        ) : (
          renderDatePicker(handleObserveDate)
        )}
      </BottomSheet>

      {/* Info BottomSheet */}
      <BottomSheet
        open={sheetMode === 'info'}
        onClose={resetSheets}
        title={tEvents('info.title')}
      >
        {infoStep === 'choose' && (
          <div className="space-y-3">
            <p className="text-sm text-warm-500 mb-1">{tEvents('info.choose_type')}</p>
            <button
              onClick={() => setInfoStep('first_day_date')}
              className="w-full py-3.5 rounded-2xl bg-[#3B82F6]/6 text-[#3B82F6] font-semibold hover:bg-[#3B82F6]/12 transition-all duration-200 text-left px-5 active:scale-[0.98]"
            >
              {tEvents('info.first_day_of_cycle')}
            </button>
            <button
              onClick={() => setInfoStep('cycle_length')}
              className="w-full py-3.5 rounded-2xl bg-[#3B82F6]/6 text-[#3B82F6] font-semibold hover:bg-[#3B82F6]/12 transition-all duration-200 text-left px-5 active:scale-[0.98]"
            >
              {tEvents('info.cycle_length_info')}
            </button>
          </div>
        )}

        {infoStep === 'first_day_date' && (
          <div className="animate-fade-in-up">
            <p className="text-sm text-warm-500 mb-4">{tEvents('info.enter_date')}</p>
            <div className="flex gap-2">
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                max={formatDate(today())}
                className="flex-1 px-4 py-3.5 rounded-2xl border border-warm-200 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6]/40 transition-all"
              />
              <button
                onClick={() => handleInfoFirstDay(customDate)}
                disabled={submitting}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] text-white font-semibold shadow-sm disabled:opacity-50 transition-all duration-200 active:scale-[0.98]"
              >
                {tCommon('actions.confirm')}
              </button>
            </div>
          </div>
        )}

        {infoStep === 'cycle_length' && (
          <div className="animate-fade-in-up">
            <p className="text-sm text-warm-500 mb-4">{tEvents('info.enter_cycle_length')}</p>
            <div className="flex gap-2">
              <input
                type="number"
                min="15"
                max="50"
                value={infoDays}
                onChange={(e) => setInfoDays(e.target.value)}
                placeholder={tEvents('info.days_placeholder')}
                className="flex-1 px-4 py-3.5 rounded-2xl border border-warm-200 text-gray-900 bg-white text-center focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/30 focus:border-[#3B82F6]/40 transition-all"
              />
              <button
                onClick={handleCycleLength}
                disabled={submitting || !infoDays}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] text-white font-semibold shadow-sm disabled:opacity-50 transition-all duration-200 active:scale-[0.98]"
              >
                {tCommon('actions.confirm')}
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
