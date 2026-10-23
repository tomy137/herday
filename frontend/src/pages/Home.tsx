// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { PhaseInfo, EchoAggregate } from '../api/client';
import type { Phase } from '../lib/cycle-engine';
import { MIN_CYCLE_LENGTH } from '../lib/cycle-engine';
import { PHASE_RANGES_28 } from '../constants/phase-meta';
import { PHASE_ZONE, ZONE_HEX, ZONE_INK_HEX, zoneEndsIn } from '../constants/phases';
import { syncPhaseToWidget } from '../native/widgetBridge';
import Header from '../components/layout/Header';
import EchoCard from '../components/home/EchoCard';
import CycleDial from '../components/home/CycleDial';
import BottomSheet from '../components/ui/BottomSheet';
import ConfidenceBadge from '../components/ui/ConfidenceBadge';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';
import { usePartner } from '../lib/partner';
import { formatDate, parseDate, today, yesterday } from '../lib/date-utils';

const capitalize = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
const firstSentence = (text: string) => {
  const end = text.indexOf('. ');
  return end === -1 ? text : text.slice(0, end + 1);
};

function DropIcon({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ stroke: color }}>
      <path d="M12 3c3.5 4.5 6 8 6 11a6 6 0 0 1-12 0c0-3 2.5-6.5 6-11z" />
    </svg>
  );
}

export default function Home() {
  const { t: tCommon, i18n } = useTranslation('common');
  const { t: tPhases } = useTranslation('phases');
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const partner = usePartner();
  const { who: partnerWho, context: partnerContext } = partner.vars;
  const phaseContent = (p: Phase) => ({
    short: tPhases(`${p}.short`),
    posture: tPhases(`${p}.posture`, { returnObjects: true }) as string[],
    bio: tPhases(`${p}.bio`),
  });

  const [info, setInfo] = useState<PhaseInfo | null>(null);
  const [echo, setEcho] = useState<EchoAggregate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [customDate, setCustomDate] = useState(formatDate(today()));
  const [submitting, setSubmitting] = useState(false);
  // Set when a new period_started is declared too close to an existing one
  // (< MIN_CYCLE_LENGTH days). Almost always a false alarm → we ask instead of
  // silently opening an implausibly short cycle.
  const [conflict, setConflict] = useState<{
    newDate: string;
    existingDate: string;
    gapDays: number;
    existingIds: string[];
  } | null>(null);

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
      zone: PHASE_ZONE[phase] ?? 'nuit',
      zoneLabel: tPhases(`zones.${PHASE_ZONE[phase] ?? 'nuit'}`),
      zoneEndsIn: zoneEndsIn(phase, phaseInfo.phase_ends_in),
      postureLabel: tPhases('labels.she_needs_you_to_be', { who: partnerWho, context: partnerContext }).replace(/\s*:\s*$/, ''),
    });
  }, [tPhases, partnerWho, partnerContext]);

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

  const daysBetween = (a: string, b: string) =>
    Math.round((parseDate(a).getTime() - parseDate(b).getTime()) / 86_400_000);

  // Persist a confirmed period start, refresh the dashboard, and close sheets.
  const createPeriodEvent = async (dateStr: string) => {
    await api.events.create({ event_type: 'period_started', event_date: dateStr, confidence: 1.0 });
    showToast(tCommon('period.saved'));
    setPeriodOpen(false);
    setShowPicker(false);
    await load();
  };

  const declarePeriod = async (dateStr: string) => {
    setSubmitting(true);
    try {
      // Guard against false alarms: a new period start within an implausibly
      // short span of an existing one would open a biologically impossible
      // cycle (< MIN_CYCLE_LENGTH days). That's almost always a false alarm or
      // a date typo, so surface a correction choice instead of creating it.
      let near: { date: string; ids: string[]; gap: number } | null = null;
      try {
        const { items } = await api.events.list(0, 100);
        const conflicting = items.filter(
          (e) =>
            e.event_type === 'period_started' &&
            Math.abs(daysBetween(dateStr, e.event_date)) < MIN_CYCLE_LENGTH,
        );
        if (conflicting.length > 0) {
          const nearest = conflicting.reduce((best, e) =>
            Math.abs(daysBetween(dateStr, e.event_date)) <
            Math.abs(daysBetween(dateStr, best.event_date))
              ? e
              : best,
          );
          near = {
            date: nearest.event_date,
            ids: conflicting.map((e) => e.id),
            gap: Math.abs(daysBetween(dateStr, nearest.event_date)),
          };
        }
      } catch {
        // History unavailable: fall through and just create the event.
      }

      if (near) {
        setPeriodOpen(false);
        setShowPicker(false);
        setConflict({
          newDate: dateStr,
          existingDate: near.date,
          gapDays: near.gap,
          existingIds: near.ids,
        });
        return;
      }

      await createPeriodEvent(dateStr);
    } catch {
      showToast(tCommon('error'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // "It was a false alarm": drop the previous start(s) and re-anchor the cycle
  // on the newly declared date — no phantom short cycle, confidence stays honest.
  const correctCurrentCycle = async () => {
    if (!conflict) return;
    setSubmitting(true);
    try {
      for (const id of conflict.existingIds) {
        await api.events.delete(id);
      }
      await createPeriodEvent(conflict.newDate);
      setConflict(null);
    } catch {
      showToast(tCommon('error'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // "They really are new periods": keep both starts, as the user insists.
  const keepBothPeriods = async () => {
    if (!conflict) return;
    setSubmitting(true);
    try {
      await createPeriodEvent(conflict.newDate);
      setConflict(null);
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
        <p className="font-medium text-danger">{tCommon('error')}</p>
      </div>
    );
  }

  const phase = info.phase as Phase;
  const isUnknown = info.system_state === 'unknown';
  const zone = PHASE_ZONE[phase] ?? 'nuit';
  const accent = ZONE_INK_HEX[zone];
  const content = phaseContent(phase);
  // The period button matters most when a period is due: give it the spotlight
  // during the pre-menstrual phase (and while there is no data at all).
  const periodSpotlight = phase === 'pre_menstrual';
  const dateLabel = new Intl.DateTimeFormat(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date())
    .replace(/^\w/, (c) => c.toUpperCase());

  const periodButton = (
    <button
      type="button"
      onClick={() => setPeriodOpen(true)}
      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-warm-300 px-3 text-[12px] text-ink transition-colors hover:bg-warm-100"
    >
      <DropIcon color={ZONE_INK_HEX.nuit} />
      {tCommon('period.declare')}
    </button>
  );

  return (
    <div>
      <Header />
      {isUnknown ? (
        <div className="flex flex-col gap-[18px] px-[22px] pb-6 pt-8">
          <div className="rounded-[20px] border border-warm-300 bg-warm-100 px-5 py-9 text-center">
            <h2 className="text-[18px] font-semibold text-ink">{tPhases('empty.title')}</h2>
            <p className="mx-auto mt-2 max-w-[18rem] text-[14px] leading-relaxed text-warm-500">
              {tPhases('empty.body')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPeriodOpen(true)}
            className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[14px] bg-ink px-5 text-[15px] font-bold text-warm-50 transition-all active:scale-[0.99]"
          >
            <DropIcon color="var(--color-warm-50)" />
            {tCommon('period.declare')}
          </button>
        </div>
      ) : (
      <div className="flex flex-col gap-4 px-5 pb-6 pt-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[30px] font-bold leading-tight tracking-tight text-ink">{tCommon('home.title')}</h1>
            <div className="text-[13px] text-warm-500">
              {dateLabel} · {tCommon('home.day', { day: info.day_in_cycle, length: info.cycle_length })}
            </div>
          </div>
          <div className="pt-2">
            <ConfidenceBadge confidence={info.confidence} systemState={info.system_state} compact />
          </div>
        </div>

        {user?.contraception === 'oui' && (
          <div className="rounded-[16px] border border-warm-300 px-4 py-3 text-[13px] leading-snug text-ink-soft">
            {tCommon('home.contraception')}
          </div>
        )}

        <CycleDial
          dayInCycle={info.day_in_cycle}
          cycleLength={info.cycle_length}
          phase={phase}
          zoneEndsIn={zoneEndsIn(phase, info.phase_ends_in)}
        />

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <span className="text-[13px] text-warm-500">{content.short}</span>
          {!periodSpotlight && periodButton}
        </div>

        <div className="rounded-[20px] bg-warm-100 px-4 py-4">
          <div className="hd-caps mb-1.5 text-warm-500">{tPhases('labels.she_needs_you_to_be', partner.vars)}</div>
          <div className="text-[22px] font-bold leading-tight" style={{ color: accent }}>
            {content.posture.slice(0, 2).map(capitalize).join(' · ')}
          </div>
          {user?.expertise_level === 'decouverte' && (
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{firstSentence(content.bio)}</p>
          )}
          <button
            type="button"
            onClick={() => navigate(`/calendar?phase=${phase}`)}
            className="mt-1 min-h-[36px] text-[13px] text-ink-soft underline-offset-2 hover:underline"
          >
            {tCommon('home.understand')} →
          </button>
        </div>

        {periodSpotlight && (
          <div className="flex flex-col gap-2.5 rounded-[20px] border-2 px-4 py-4" style={{ borderColor: ZONE_HEX.nuit }}>
            <div className="flex items-center gap-2.5">
              <DropIcon color={ZONE_INK_HEX.nuit} size={22} />
              <div className="text-[16px] font-bold text-ink">{tCommon('period.prompt_title')}</div>
            </div>
            <p className="text-[13px] leading-snug text-ink-soft">{tCommon('period.prompt_body')}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => declarePeriod(formatDate(today()))}
                disabled={submitting}
                className="min-h-[44px] rounded-[12px] text-[14px] font-bold disabled:opacity-50"
                style={{ background: ZONE_INK_HEX.nuit, color: 'var(--color-on-accent)' }}
              >
                {tCommon('period.prompt_today')}
              </button>
              <button
                type="button"
                onClick={() => setPeriodOpen(true)}
                className="min-h-[44px] rounded-[12px] border border-warm-300 text-[14px] text-ink"
              >
                {tCommon('period.prompt_other')}
              </button>
            </div>
          </div>
        )}

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

      <BottomSheet
        open={conflict !== null}
        onClose={() => setConflict(null)}
        title={tCommon('period.conflict.title')}
      >
        {conflict && (
          <div className="flex flex-col gap-3">
            <p className="text-[13.5px] leading-relaxed text-warm-500">
              {conflict.gapDays === 0
                ? tCommon('period.conflict.body_same')
                : tCommon('period.conflict.body', { count: conflict.gapDays })}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={correctCurrentCycle}
                disabled={submitting}
                className="rounded-[10px] bg-ink px-5 py-3 text-[14px] font-medium text-warm-50 disabled:opacity-50"
              >
                {tCommon('period.conflict.correct')}
              </button>
              <button
                type="button"
                onClick={keepBothPeriods}
                disabled={submitting}
                className="rounded-[10px] border-[0.5px] border-warm-300 px-5 py-3 text-[14px] font-medium text-ink transition-colors hover:bg-warm-100 disabled:opacity-50"
              >
                {tCommon('period.conflict.keep')}
              </button>
              <button
                type="button"
                onClick={() => setConflict(null)}
                disabled={submitting}
                className="rounded-[10px] px-5 py-3 text-[13px] font-medium text-warm-500 transition-colors hover:text-ink disabled:opacity-50"
              >
                {tCommon('actions.cancel')}
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
