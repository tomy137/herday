// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Phase } from '../lib/cycle-engine';

/**
 * Palette "4 teintes" : une teinte par zone du cycle (Nuit, Aube, Jour,
 * Crépuscule), partagée par le calendrier, le graphe et le widget.
 * Dans une zone à deux phases, la phase principale (règles, ovulation) prend
 * la teinte pleine et sa voisine (pré-menstruelle, pré-ovulatoire) une version
 * éclaircie. Les zones regroupent les phases comme les périodes du flux ICS :
 * Nuit = Période A, Jour = Période B.
 */
export type Zone = 'nuit' | 'aube' | 'jour' | 'crepuscule';

export const ZONE_ORDER: Zone[] = ['nuit', 'aube', 'jour', 'crepuscule'];

export const PHASE_ZONE: Record<Phase, Zone> = {
  menstruation: 'nuit',
  post_menstrual: 'aube',
  pre_ovulatory: 'jour',
  ovulation: 'jour',
  post_ovulatory: 'crepuscule',
  pre_menstrual: 'nuit',
};

export const ZONE_ICONS: Record<Zone, string> = {
  nuit: '🌙',
  aube: '🌅',
  jour: '☀️',
  crepuscule: '🌇',
};

/** Full zone hue (ring segments, accents). */
export const ZONE_HEX: Record<Zone, string> = {
  nuit: '#DC3D5A',
  aube: '#E5B30B',
  jour: '#2DA87E',
  crepuscule: '#4A6FB5',
};

/** Dark zone colour: text on soft fills, and the dial's centre disc (white text ≥ 4.5:1). */
export const ZONE_INK_HEX: Record<Zone, string> = {
  nuit: '#8E1F33',
  aube: '#765600',
  jour: '#1C6B50',
  crepuscule: '#2B4475',
};

/**
 * Days left in the current zone (0 = last day), from the engine's phase_ends_in.
 * Two-phase zones add the span of the phase that follows: the 5-day ovulation
 * window after pre-ovulatory, the period after pre-menstrual.
 */
export function zoneEndsIn(phase: Phase, phaseEndsIn: number | null, periodDuration = 5): number | null {
  if (phaseEndsIn == null) return null;
  if (phase === 'pre_ovulatory') return phaseEndsIn + 5;
  if (phase === 'pre_menstrual') return phaseEndsIn + periodDuration;
  return phaseEndsIn;
}

export const PHASE_COLORS: Record<Phase, {
  bg: string;
  text: string;
  light: string;
  border: string;
  gradient: string;
}> = {
  menstruation: {
    bg: 'bg-[#DC3D5A]',
    text: 'text-[#8E1F33]',
    light: 'bg-[#DC3D5A]/8',
    border: 'border-[#DC3D5A]/20',
    gradient: 'from-[#DC3D5A] to-[#E8647D]',
  },
  post_menstrual: {
    bg: 'bg-[#E5B30B]',
    text: 'text-[#765600]',
    light: 'bg-[#E5B30B]/10',
    border: 'border-[#E5B30B]/25',
    gradient: 'from-[#E5B30B] to-[#F0CC55]',
  },
  pre_ovulatory: {
    bg: 'bg-[#8CCFB8]',
    text: 'text-[#1C6B50]',
    light: 'bg-[#8CCFB8]/12',
    border: 'border-[#8CCFB8]/30',
    gradient: 'from-[#8CCFB8] to-[#B5E0D1]',
  },
  ovulation: {
    bg: 'bg-[#2DA87E]',
    text: 'text-[#1C6B50]',
    light: 'bg-[#2DA87E]/8',
    border: 'border-[#2DA87E]/20',
    gradient: 'from-[#2DA87E] to-[#4DC49E]',
  },
  post_ovulatory: {
    bg: 'bg-[#4A6FB5]',
    text: 'text-[#2B4475]',
    light: 'bg-[#4A6FB5]/8',
    border: 'border-[#4A6FB5]/20',
    gradient: 'from-[#4A6FB5] to-[#7391CA]',
  },
  pre_menstrual: {
    bg: 'bg-[#EC94A4]',
    text: 'text-[#8E1F33]',
    light: 'bg-[#EC94A4]/12',
    border: 'border-[#EC94A4]/30',
    gradient: 'from-[#EC94A4] to-[#F4BCC6]',
  },
};

/** Each phase shows its zone's glyph (same as the dial and the ICS feed). */
export const PHASE_ICONS: Record<Phase, string> = {
  menstruation: ZONE_ICONS.nuit,
  post_menstrual: ZONE_ICONS.aube,
  pre_ovulatory: ZONE_ICONS.jour,
  ovulation: ZONE_ICONS.jour,
  post_ovulatory: ZONE_ICONS.crepuscule,
  pre_menstrual: ZONE_ICONS.nuit,
};

export const PHASE_HEX: Record<Phase, string> = {
  menstruation: '#DC3D5A',
  post_menstrual: '#E5B30B',
  pre_ovulatory: '#8CCFB8',
  ovulation: '#2DA87E',
  post_ovulatory: '#4A6FB5',
  pre_menstrual: '#EC94A4',
};

/**
 * Pale fill behind phase cards / calendar cells / hormone bands.
 * AA-checked against PHASE_INK_HEX (must mirror the CSS vars in index.css).
 */
export const PHASE_SOFT_HEX: Record<Phase, string> = {
  menstruation: '#F7D4DB',
  post_menstrual: '#F9EEC9',
  pre_ovulatory: '#EAF6F2',
  ovulation: '#D1ECE3',
  post_ovulatory: '#D7DFEF',
  pre_menstrual: '#FCECEF',
};

/**
 * Readable dark text colour for a given phase, sits on PHASE_SOFT_HEX.
 * Each pair validated ≥ 4.5:1 contrast (WCAG AA for body text).
 */
export const PHASE_INK_HEX: Record<Phase, string> = {
  menstruation: ZONE_INK_HEX.nuit,
  post_menstrual: ZONE_INK_HEX.aube,
  pre_ovulatory: ZONE_INK_HEX.jour,
  ovulation: ZONE_INK_HEX.jour,
  post_ovulatory: ZONE_INK_HEX.crepuscule,
  pre_menstrual: ZONE_INK_HEX.nuit,
};
