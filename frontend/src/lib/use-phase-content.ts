// SPDX-License-Identifier: AGPL-3.0-or-later
import { useTranslation } from 'react-i18next';
import type { Phase } from './cycle-engine';

export interface PhaseContent {
  name: string;
  short: string;
  range: string;
  headline: string;
  posture: string[];
  observable: string[];
  propose: string[];
  avoid: string[];
}

/** Reads the editorial content for a phase from the `phases` i18n namespace. */
export function usePhaseContent(phase: Phase): PhaseContent {
  const { t } = useTranslation('phases');
  return {
    name: t(`${phase}.name`),
    short: t(`${phase}.short`),
    range: t(`${phase}.range`),
    headline: t(`${phase}.headline`),
    posture: t(`${phase}.posture`, { returnObjects: true }) as string[],
    observable: t(`${phase}.observable`, { returnObjects: true }) as string[],
    propose: t(`${phase}.propose`, { returnObjects: true }) as string[],
    avoid: t(`${phase}.avoid`, { returnObjects: true }) as string[],
  };
}
