// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * How the app refers to the partner: the optional nickname, else the chosen
 * pronoun (elle / il / iel). Feed `who` + `context` to i18n strings that start
 * with the partner, e.g. t('labels.she_needs_you_to_be', partnerVars).
 */
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import type { Pronouns } from '../api/client';

export interface PartnerVars {
  /** Capitalised subject: « Lou », « Elle », « Iel »… */
  who: string;
  /** i18n context (pronoun) — only when no nickname, so grammar follows the pronoun. */
  context?: Pronouns;
}

export function usePartner(): {
  /** Interpolation options for i18n: t(key, partner.vars). */
  vars: PartnerVars & Record<string, string | undefined>;
  nickname: string | null;
  pronouns: Pronouns;
} {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const pronouns: Pronouns = user?.partner_pronouns ?? 'elle';
  const nickname = user?.partner_nickname?.trim() || null;
  return {
    vars: { who: nickname ?? t(`partner.pronoun.${pronouns}`), context: nickname ? undefined : pronouns },
    nickname,
    pronouns,
  };
}
