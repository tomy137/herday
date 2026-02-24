// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Phase } from '../lib/cycle-engine';

export interface EventTypeDefinition {
  type: string;
  category: 'period' | 'mood' | 'info' | 'symptom';
  labelKey: string; // i18n key
  icon: string;
  weight: 'strong' | 'medium' | 'weak';
  phaseHint: Phase | null;
  needsMetadata: boolean;
}

export const EVENT_TYPES: EventTypeDefinition[] = [
  {
    type: 'period_started',
    category: 'period',
    labelKey: 'events:period.started',
    icon: '🩸',
    weight: 'strong',
    phaseHint: 'menstruation',
    needsMetadata: false,
  },
  {
    type: 'period_ongoing',
    category: 'period',
    labelKey: 'events:period.ongoing',
    icon: '🩸',
    weight: 'medium',
    phaseHint: 'menstruation',
    needsMetadata: false,
  },
  {
    type: 'period_ended',
    category: 'period',
    labelKey: 'events:period.ended',
    icon: '✅',
    weight: 'strong',
    phaseHint: null,
    needsMetadata: false,
  },
  {
    type: 'period_predicted',
    category: 'period',
    labelKey: 'events:period.predicted',
    icon: '🔮',
    weight: 'strong',
    phaseHint: 'menstruation',
    needsMetadata: true,
  },
  {
    type: 'period_late',
    category: 'period',
    labelKey: 'events:period.late',
    icon: '⏰',
    weight: 'medium',
    phaseHint: null,
    needsMetadata: false,
  },
  {
    type: 'mood_irritable',
    category: 'mood',
    labelKey: 'events:mood.irritable',
    icon: '😤',
    weight: 'weak',
    phaseHint: 'luteal',
    needsMetadata: false,
  },
  {
    type: 'mood_tired',
    category: 'mood',
    labelKey: 'events:mood.tired',
    icon: '😴',
    weight: 'weak',
    phaseHint: null,
    needsMetadata: false,
  },
  {
    type: 'mood_energetic',
    category: 'mood',
    labelKey: 'events:mood.energetic',
    icon: '⚡',
    weight: 'weak',
    phaseHint: 'follicular',
    needsMetadata: false,
  },
  {
    type: 'mood_emotional',
    category: 'mood',
    labelKey: 'events:mood.emotional',
    icon: '🥺',
    weight: 'weak',
    phaseHint: 'luteal',
    needsMetadata: false,
  },
  {
    type: 'mood_sexy',
    category: 'mood',
    labelKey: 'events:mood.sexy',
    icon: '🔥',
    weight: 'weak',
    phaseHint: 'ovulation',
    needsMetadata: false,
  },
  {
    type: 'cycle_length_info',
    category: 'info',
    labelKey: 'events:info.cycle_length_info',
    icon: '📏',
    weight: 'medium',
    phaseHint: null,
    needsMetadata: true,
  },
];

export function getEventType(type: string): EventTypeDefinition | undefined {
  return EVENT_TYPES.find(et => et.type === type);
}

export function getEventIcon(type: string): string {
  return getEventType(type)?.icon ?? '📌';
}
