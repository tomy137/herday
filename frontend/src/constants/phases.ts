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
  follicular: {
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
  luteal: {
    bg: 'bg-[#7E4FD0]',
    text: 'text-[#7E4FD0]',
    light: 'bg-[#7E4FD0]/8',
    border: 'border-[#7E4FD0]/20',
    gradient: 'from-[#7E4FD0] to-[#9E78E0]',
  },
};

export const PHASE_ICONS: Record<Phase, string> = {
  menstruation: '🔴',
  follicular: '🌱',
  ovulation: '🌟',
  luteal: '🌙',
};
