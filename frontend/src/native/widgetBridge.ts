import { Capacitor, registerPlugin } from '@capacitor/core';

interface WidgetBridgePlugin {
  setPhaseData(data: WidgetPhasePayload): Promise<{ ok: boolean }>;
  clearPhaseData(): Promise<{ ok: boolean }>;
}

export interface WidgetPhasePayload {
  phase: string;
  phaseLabel: string;
  dayInCycle: number;
  cycleLength: number;
  nextPeriodIn: number | null;
  phaseEndsIn: number | null;
  tipTitle: string;
  tipBody: string;
  systemState: string;
  // V2 posture widget fields
  posture: string[];
  range: string;
  phaseSpan: number;
  phaseDayIdx: number;
  echoHelpful: string | null;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge');

export async function syncPhaseToWidget(payload: WidgetPhasePayload): Promise<{ ok: boolean; error?: string }> {
  if (Capacitor.getPlatform() !== 'ios') return { ok: true };
  try {
    await WidgetBridge.setPhaseData(payload);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('WidgetBridge.setPhaseData failed', msg);
    return { ok: false, error: msg };
  }
}

export async function clearWidget(): Promise<void> {
  if (Capacitor.getPlatform() !== 'ios') return;
  try {
    await WidgetBridge.clearPhaseData();
  } catch (err) {
    console.warn('WidgetBridge.clearPhaseData failed', err);
  }
}
