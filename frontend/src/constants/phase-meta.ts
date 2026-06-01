// SPDX-License-Identifier: AGPL-3.0-or-later
// Non-text metadata for the V2 redesign: parent-phase grouping (échos),
// the journal pastille catalogue, and the reference 28-day phase bands.
// All keyed on the canonical underscore phase ids (see lib/cycle-engine.ts).
import type { Phase } from '../lib/cycle-engine';

/**
 * Four "parent" phases group the six sub-phases. Used only for the cross-cycle
 * memory (échos) aggregation — never shown directly as a phase in the UI.
 */
export type ParentPhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

export const PHASE_PARENT: Record<Phase, ParentPhase> = {
  menstruation: 'menstrual',
  post_menstrual: 'follicular',
  pre_ovulatory: 'follicular',
  ovulation: 'ovulatory',
  post_ovulatory: 'luteal',
  pre_menstrual: 'luteal',
};

export const PARENT_PHASES: ParentPhase[] = [
  'menstrual',
  'follicular',
  'ovulatory',
  'luteal',
];

/** Sub-phases that make up each parent (display order). */
export const SUBPHASES_OF_PARENT: Record<ParentPhase, Phase[]> = {
  menstrual: ['menstruation'],
  follicular: ['post_menstrual', 'pre_ovulatory'],
  ovulatory: ['ovulation'],
  luteal: ['post_ovulatory', 'pre_menstrual'],
};

/**
 * Journal pastille catalogue (12 items). Glyphs are typographic characters
 * (not emoji), rendered in DM Sans. Labels live in i18n (journal.pastilles.*).
 */
export const PASTILLE_IDS = [
  'dispute',
  'fatigue',
  'repli',
  'coquin',
  'tendresse',
  'rires',
  'douleur',
  'larmes',
  'bon-moment',
  'energie',
  'pulsion',
  'soutien',
] as const;

export type PastilleId = (typeof PASTILLE_IDS)[number];

export const PASTILLE_GLYPHS: Record<PastilleId, string> = {
  dispute: '~',
  fatigue: '◐',
  repli: '◯',
  coquin: '✦',
  tendresse: '♡',
  rires: '◡',
  douleur: '×',
  larmes: '◇',
  'bon-moment': '◆',
  energie: '↑',
  pulsion: '▤',
  soutien: '⤳',
};

/**
 * Reference day-in-cycle bands for a 28-day cycle. Used by the calendar legend
 * and hormone graph as a visual reference; the engine computes real phases
 * dynamically (these are approximations for the editorial bands).
 */
export const PHASE_RANGES_28: Record<Phase, { from: number; to: number }> = {
  menstruation: { from: 1, to: 5 },
  post_menstrual: { from: 6, to: 10 },
  pre_ovulatory: { from: 11, to: 13 },
  ovulation: { from: 14, to: 16 },
  post_ovulatory: { from: 17, to: 22 },
  pre_menstrual: { from: 23, to: 28 },
};

/** Display order of the six sub-phases (menstruation → pre-menstrual). */
export const PHASE_ORDER: Phase[] = [
  'menstruation',
  'post_menstrual',
  'pre_ovulatory',
  'ovulation',
  'post_ovulatory',
  'pre_menstrual',
];
