// SPDX-License-Identifier: AGPL-3.0-or-later
import type { Phase } from '../lib/cycle-engine';

export const PHASE_COLORS: Record<Phase, {
  bg: string;
  text: string;
  light: string;
  border: string;
  gradient: string;
}> = {
  menstruation: {
    bg: 'bg-[#DC3D5A]',
    text: 'text-[#DC3D5A]',
    light: 'bg-[#DC3D5A]/8',
    border: 'border-[#DC3D5A]/20',
    gradient: 'from-[#DC3D5A] to-[#E8647D]',
  },
  post_menstrual: {
    bg: 'bg-[#7FCFAE]',
    text: 'text-[#5BA787]',
    light: 'bg-[#7FCFAE]/10',
    border: 'border-[#7FCFAE]/25',
    gradient: 'from-[#7FCFAE] to-[#A2DFC4]',
  },
  pre_ovulatory: {
    bg: 'bg-[#2DA87E]',
    text: 'text-[#2DA87E]',
    light: 'bg-[#2DA87E]/8',
    border: 'border-[#2DA87E]/20',
    gradient: 'from-[#2DA87E] to-[#4DC49E]',
  },
  ovulation: {
    bg: 'bg-[#D4880F]',
    text: 'text-[#D4880F]',
    light: 'bg-[#D4880F]/8',
    border: 'border-[#D4880F]/20',
    gradient: 'from-[#D4880F] to-[#E8A83A]',
  },
  post_ovulatory: {
    bg: 'bg-[#9E78E0]',
    text: 'text-[#9E78E0]',
    light: 'bg-[#9E78E0]/8',
    border: 'border-[#9E78E0]/20',
    gradient: 'from-[#9E78E0] to-[#B89AEA]',
  },
  pre_menstrual: {
    bg: 'bg-[#5D3A9E]',
    text: 'text-[#5D3A9E]',
    light: 'bg-[#5D3A9E]/8',
    border: 'border-[#5D3A9E]/20',
    gradient: 'from-[#5D3A9E] to-[#7E4FD0]',
  },
};

export const PHASE_ICONS: Record<Phase, string> = {
  menstruation: '🔴',
  post_menstrual: '🌱',
  pre_ovulatory: '🌿',
  ovulation: '🌟',
  post_ovulatory: '🌙',
  pre_menstrual: '🌑',
};

export const PHASE_HEX: Record<Phase, string> = {
  menstruation: '#DC3D5A',
  post_menstrual: '#7FCFAE',
  pre_ovulatory: '#2DA87E',
  ovulation: '#D4880F',
  post_ovulatory: '#9E78E0',
  pre_menstrual: '#5D3A9E',
};

/**
 * Pale fill behind phase cards / calendar cells / hormone bands.
 * AA-checked against PHASE_INK_HEX (must mirror the CSS vars in index.css).
 */
export const PHASE_SOFT_HEX: Record<Phase, string> = {
  menstruation: '#FBEAEE',
  post_menstrual: '#EAF6F0',
  pre_ovulatory: '#E6F4EE',
  ovulation: '#FBF0DC',
  post_ovulatory: '#F0EAFA',
  pre_menstrual: '#ECE7F5',
};

/**
 * Readable dark text colour for a given phase, sits on PHASE_SOFT_HEX.
 * Each pair validated ≥ 4.5:1 contrast (WCAG AA for body text).
 */
export const PHASE_INK_HEX: Record<Phase, string> = {
  menstruation: '#8E1F33',
  post_menstrual: '#2E7355',
  pre_ovulatory: '#1C6B50',
  ovulation: '#8A560A',
  post_ovulatory: '#5B3D9E',
  pre_menstrual: '#412A6E',
};
