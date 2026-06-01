// SPDX-License-Identifier: AGPL-3.0-or-later
// Frontend mirror of backend/app/services/cycle_engine.py
// See docs/CYCLE_ENGINE.md for detailed documentation

export const DEFAULT_CYCLE_LENGTH = 28;
export const DEFAULT_PERIOD_DURATION = 5;
export const LUTEAL_PHASE_LENGTH = 14;
export const MIN_CYCLE_LENGTH = 18;
export const MAX_CYCLE_LENGTH = 45; // above this, a "cycle" is almost certainly a missed log

export type SystemState = 'unknown' | 'estimating' | 'partial' | 'learning' | 'confident';
export type Phase =
  | 'menstruation'
  | 'post_menstrual'
  | 'pre_ovulatory'
  | 'ovulation'
  | 'post_ovulatory'
  | 'pre_menstrual';

const PRE_OVULATORY_DAYS = 2;
const PRE_MENSTRUAL_DAYS = 6;

export interface CycleData {
  id: string;
  start_date: string;
  end_date: string | null;
  period_duration: number | null;
  cycle_length: number | null;
  source: 'confirmed' | 'inferred';
  confidence: number;
}

export interface PhaseInfo {
  phase: Phase;
  dayInCycle: number;
  cycleLength: number;
  confidence: number;
  systemState: SystemState;
  nextPeriodIn: number | null;
}

const STATE_CONFIDENCE: Record<SystemState, number> = {
  unknown: 0.0,
  estimating: 0.2,
  partial: 0.4,
  learning: 0.7,
  confident: 0.9,
};

export function getSystemState(cycles: CycleData[]): SystemState {
  const confirmed = cycles.filter(c => c.source === 'confirmed');
  const inferred = cycles.filter(c => c.source === 'inferred');

  if (confirmed.length === 0 && inferred.length === 0) return 'unknown';
  if (confirmed.length === 0 && inferred.length > 0) return 'estimating';
  if (confirmed.length === 1) return 'partial';
  if (confirmed.length === 2) return 'learning';
  return 'confident';
}

function averageCycleLength(cycles: CycleData[]): number {
  // Mirror of the backend: only plausible lengths feed the average, so an
  // outlier (e.g. a 56-day span from a missed period log) can't skew the
  // predicted cycle length and the hormone-graph axis.
  const lengths = cycles
    .filter(c => c.cycle_length != null && c.source === 'confirmed'
      && c.cycle_length >= MIN_CYCLE_LENGTH && c.cycle_length <= MAX_CYCLE_LENGTH)
    .map(c => c.cycle_length!);
  if (lengths.length === 0) return DEFAULT_CYCLE_LENGTH;
  const avg = Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
  return Math.min(Math.max(avg, MIN_CYCLE_LENGTH), MAX_CYCLE_LENGTH);
}

function averagePeriodDuration(cycles: CycleData[]): number {
  const durations = cycles
    .filter(c => c.period_duration != null && c.source === 'confirmed')
    .map(c => c.period_duration!);
  if (durations.length === 0) return DEFAULT_PERIOD_DURATION;
  return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
}

function dayToPhase(
  day: number,
  periodDuration: number,
  ovulationDay: number,
  cycleLength: number,
): Phase {
  if (day <= periodDuration) return 'menstruation';

  const ovuStart = ovulationDay - 2;
  const ovuEnd = ovulationDay + 2;

  if (day < ovuStart) {
    return day < ovuStart - PRE_OVULATORY_DAYS ? 'post_menstrual' : 'pre_ovulatory';
  }
  if (day <= ovuEnd) return 'ovulation';

  const preMenstrualStart = cycleLength - PRE_MENSTRUAL_DAYS + 1;
  return day < preMenstrualStart ? 'post_ovulatory' : 'pre_menstrual';
}

function diffDays(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

export function calculatePhase(targetDate: Date, cycles: CycleData[]): PhaseInfo {
  const state = getSystemState(cycles);

  if (state === 'unknown') {
    return {
      phase: 'post_menstrual',
      dayInCycle: 0,
      cycleLength: DEFAULT_CYCLE_LENGTH,
      confidence: 0.0,
      systemState: state,
      nextPeriodIn: null,
    };
  }

  const avgCycleLen = averageCycleLength(cycles);
  const avgPeriodDur = averagePeriodDuration(cycles);

  // Find most recent cycle start <= targetDate
  const pastCycles = cycles
    .filter(c => new Date(c.start_date) <= targetDate)
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

  let dayInCycle: number;

  if (pastCycles.length === 0) {
    const first = [...cycles].sort(
      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    )[0];
    const diff = diffDays(targetDate, new Date(first.start_date));
    dayInCycle = ((diff % avgCycleLen) + avgCycleLen) % avgCycleLen + 1;
  } else {
    const ref = pastCycles[pastCycles.length - 1];
    const cycleLen = ref.cycle_length || avgCycleLen;
    dayInCycle = diffDays(targetDate, new Date(ref.start_date)) + 1;
    if (dayInCycle > cycleLen) {
      dayInCycle = ((dayInCycle - 1) % cycleLen) + 1;
    }
  }

  const ovulationDay = avgCycleLen - LUTEAL_PHASE_LENGTH;
  const phase = dayToPhase(dayInCycle, avgPeriodDur, ovulationDay, avgCycleLen);
  const confidence = STATE_CONFIDENCE[state];

  let nextPeriodIn = avgCycleLen - dayInCycle + 1;
  if (nextPeriodIn <= 0) nextPeriodIn = 1;

  return {
    phase,
    dayInCycle,
    cycleLength: avgCycleLen,
    confidence,
    systemState: state,
    nextPeriodIn,
  };
}

// Generate phase info for each day of a month
export function calculateCalendarMonth(
  year: number,
  month: number, // 0-indexed (JS convention)
  cycles: CycleData[],
): Array<{ date: Date; phase: Phase | null; confidence: number }> {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const result: Array<{ date: Date; phase: Phase | null; confidence: number }> = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    if (cycles.length === 0) {
      result.push({ date, phase: null, confidence: 0 });
    } else {
      const info = calculatePhase(date, cycles);
      result.push({ date, phase: info.phase, confidence: info.confidence });
    }
  }

  return result;
}
