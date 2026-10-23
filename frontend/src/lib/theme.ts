// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Theme preference: « nuit » (default), « clair », or « auto » (follows the
 * system). Stored on the device only; applied as `data-theme` on <html>, which
 * switches the CSS custom properties defined in index.css.
 */
import { useEffect, useState } from 'react';

export type ThemePref = 'nuit' | 'clair' | 'auto';
export type Theme = 'nuit' | 'clair';

const STORAGE_KEY = 'herday-theme';
const PREFS: ThemePref[] = ['nuit', 'clair', 'auto'];
const EVENT = 'herday-theme-change';

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && (PREFS as string[]).includes(v)) return v as ThemePref;
  } catch {
    // storage unavailable (private mode): fall back to the default
  }
  return 'nuit';
}

const systemDark = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export function resolveTheme(pref: ThemePref): Theme {
  if (pref === 'auto') return systemDark() ? 'nuit' : 'clair';
  return pref;
}

function apply(pref: ThemePref) {
  const theme = resolveTheme(pref);
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'nuit' ? '#0E1530' : '#FDFBF7');
}

export function setThemePref(pref: ThemePref) {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    // keep the in-memory choice for this session
  }
  apply(pref);
  window.dispatchEvent(new Event(EVENT));
}

/** Apply the stored preference and keep « auto » in sync with the system. */
export function initTheme() {
  apply(getThemePref());
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (getThemePref() === 'auto') apply('auto');
  });
}

/** Current preference, re-rendering when it changes anywhere in the app. */
export function useThemePref(): [ThemePref, (pref: ThemePref) => void] {
  const [pref, setPref] = useState<ThemePref>(getThemePref);
  useEffect(() => {
    const onChange = () => setPref(getThemePref());
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  return [pref, setThemePref];
}
