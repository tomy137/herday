// SPDX-License-Identifier: AGPL-3.0-or-later
import { DEFAULT_PERIOD_DURATION } from './cycle-engine';
import type { Zone } from '../constants/phases';

/** Stroke icons of the four moments (24×24 grid, round caps). */
export const ZONE_ICON_PATHS: Record<Zone, string> = {
  nuit: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
  aube: 'M12 2v8M4.93 10.93l1.41 1.41M2 18h2M20 18h2M19.07 10.93l-1.41 1.41M22 22H2M8 6l4-4 4 4M16 18a4 4 0 0 0-8 0',
  jour: 'M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41',
  crepuscule: 'M12 10V2M4.93 10.93l1.41 1.41M2 18h2M20 18h2M19.07 10.93l-1.41 1.41M22 22H2M16 6l-4 4-4-4M16 18a4 4 0 0 0-8 0',
};

/**
 * Day range of each zone for a cycle of length L (Nuit runs past day L into the
 * next period: L+1…L+P). Mirrors the engine's phase bounds; null when a very
 * short cycle leaves a zone empty.
 */
export function zoneBounds(L: number, P = DEFAULT_PERIOD_DURATION): Record<Zone, [number, number] | null> {
  const valid = (r: [number, number]): [number, number] | null => (r[1] >= r[0] ? r : null);
  return {
    nuit: valid([L - 5, L + P]),
    aube: valid([P + 1, L - 19]),
    jour: valid([Math.max(P + 1, L - 18), L - 12]),
    crepuscule: valid([L - 11, L - 6]),
  };
}
