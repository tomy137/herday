// SPDX-License-Identifier: AGPL-3.0-or-later
import { useTranslation } from 'react-i18next';
import type { Phase } from './cycle-engine';

export interface PhaseContent {
  name: string;
  short: string;
  range: string;
  posture: string[];
  /** Biological reference paragraph ("Repères biologiques"). */
  bio: string;
  /** "Conseillé" — recommended attitudes. */
  advised: string[];
  /** "Déconseillé" — attitudes to avoid. */
  discouraged: string[];
}

/** Reads the editorial content for a phase from the `phases` i18n namespace. */
export function usePhaseContent(phase: Phase): PhaseContent {
  const { t } = useTranslation('phases');
  return {
    name: t(`${phase}.name`),
    short: t(`${phase}.short`),
    range: t(`${phase}.range`),
    posture: t(`${phase}.posture`, { returnObjects: true }) as string[],
    bio: t(`${phase}.bio`),
    advised: t(`${phase}.advised`, { returnObjects: true }) as string[],
    discouraged: t(`${phase}.discouraged`, { returnObjects: true }) as string[],
  };
}
