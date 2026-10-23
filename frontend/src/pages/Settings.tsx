// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Contraception, Event, Pronouns, UserUpdate } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import Header from '../components/layout/Header';
import SettingsGroup from '../components/settings/SettingsGroup';
import SettingsRow from '../components/settings/SettingsRow';
import CalendarFeedSettings from '../components/settings/CalendarFeedSettings';
import { APP_VERSION } from '../constants/version';
import { useThemePref } from '../lib/theme';
import type { ThemePref } from '../lib/theme';

const LANGUAGES = ['fr', 'en', 'de'] as const;
const THEMES: ThemePref[] = ['nuit', 'clair', 'auto'];
const PRONOUNS: Pronouns[] = ['elle', 'il', 'iel'];
const CONTRACEPTION: Contraception[] = ['non', 'oui', 'inconnu'];

/** Compact segmented control, one choice among a few. */
function Choice<T extends string>({ label, options, value, onChange, labelOf }: {
  label: string;
  options: readonly T[];
  value: T | null | undefined;
  onChange: (v: T) => void;
  labelOf: (v: T) => string;
}) {
  return (
    <div className="px-[18px] py-3.5">
      <div className="mb-2.5 text-[14px] text-ink">{label}</div>
      <div role="radiogroup" aria-label={label} className="flex gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={value === o}
            onClick={() => onChange(o)}
            className={`min-h-[40px] flex-1 rounded-[10px] text-[13px] font-medium transition-colors ${
              value === o ? 'bg-ink text-warm-50' : 'bg-warm-200 text-ink-soft hover:bg-warm-300'
            }`}
          >
            {labelOf(o)}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Settings() {
  const { t, i18n } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [themePref, setThemePref] = useThemePref();

  const [events, setEvents] = useState<Event[]>([]);
  const [nickname, setNickname] = useState(user?.partner_nickname ?? '');
  const [showData, setShowData] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.events.list(0, 100).then((d) => setEvents(d.items)).catch(() => {});
  }, []);

  const changeLanguage = async (lang: string) => {
    await i18n.changeLanguage(lang);
    api.users.update({ locale: lang }).catch(() => {});
  };

  const updateProfile = async (data: UserUpdate) => {
    try {
      await api.users.update(data);
      await refreshUser();
    } catch {
      showToast(tCommon('error'), 'error');
    }
  };

  const saveNickname = () => {
    if (nickname.trim() === (user?.partner_nickname ?? '')) return;
    void updateProfile({ partner_nickname: nickname.trim() });
  };

  const markTold = async () => {
    try {
      await api.users.update({ transparency_status: 'told_already' });
      await refreshUser();
      showToast(t('transparency.accepted_already'));
    } catch {
      showToast(tCommon('error'), 'error');
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await api.users.delete();
      await logout();
    } catch {
      showToast(tCommon('error'), 'error');
      setDeleting(false);
    }
  };

  const status = user?.transparency_status ?? 'not_yet';
  const statusLabel =
    status === 'told_already'
      ? t('transparency.accepted_already')
      : status === 'told_soon'
        ? t('transparency.accepted_soon')
        : t('transparency.not_yet');
  const lastPeriod = events.find((e) => e.event_type === 'period_started')?.event_date;

  return (
    <div>
      <Header rightLabel={tCommon('nav.settings').toUpperCase()} />
      <div className="flex flex-col gap-[22px] px-5 pb-6 pt-2">
        <h1 className="text-[30px] font-bold leading-tight tracking-tight text-ink">{t('title')}</h1>

        {/* Partner: optional nickname + pronouns used in the app's sentences */}
        <SettingsGroup title={t('groups.partner')}>
          <div className="px-[18px] py-3.5">
            <label htmlFor="set-nickname" className="mb-1.5 block text-[14px] text-ink">{t('partner.nickname')}</label>
            <input
              id="set-nickname"
              type="text"
              maxLength={40}
              value={nickname}
              placeholder={tCommon(`partner.pronoun.${user?.partner_pronouns ?? 'elle'}`)}
              onChange={(e) => setNickname(e.target.value)}
              onBlur={saveNickname}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              aria-describedby="set-nickname-hint"
              className="w-full rounded-[12px] border border-warm-300 bg-warm-50 px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-ink"
            />
            <p id="set-nickname-hint" className="mt-1.5 text-[12px] leading-snug text-warm-500">{t('partner.nickname_hint')}</p>
          </div>
          <Choice
            label={t('partner.pronouns')}
            options={PRONOUNS}
            value={user?.partner_pronouns}
            onChange={(p) => updateProfile({ partner_pronouns: p })}
            labelOf={(p) => tCommon(`partner.pronoun.${p}`).toLowerCase()}
          />
        </SettingsGroup>

        {/* Transparency pact */}
        <SettingsGroup
          title={t('transparency.group')}
          status={status !== 'not_yet' ? t('transparency.status_label') : undefined}
        >
          <div className="px-[18px] py-4">
            <div className="hd-caps mb-2" style={{ color: status !== 'not_yet' ? 'var(--color-success)' : 'var(--color-warm-500)' }}>
              {status !== 'not_yet' ? '✓ ' : ''}{statusLabel}
            </div>
            <p className="text-[13.5px] leading-relaxed text-ink-soft">{t('transparency.body')}</p>
          </div>
          {status !== 'told_already' && (
            <SettingsRow label={t('transparency.mark_told')} hint={t('transparency.mark_told_hint')} onClick={markTold} />
          )}
        </SettingsGroup>

        {/* Her cycle */}
        <SettingsGroup title={t('groups.her_data')}>
          <SettingsRow label={t('her_data.last_period')} value={lastPeriod ?? '—'} />
          <Choice
            label={t('her_data.contraception')}
            options={CONTRACEPTION}
            value={user?.contraception ?? null}
            onChange={(c) => updateProfile({ contraception: c })}
            labelOf={(c) => t(`her_data.contraception_options.${c}`)}
          />
        </SettingsGroup>

        {/* Shared calendar (living iCal feed) */}
        <CalendarFeedSettings />

        {/* Journal */}
        <SettingsGroup title={t('groups.journal')}>
          <SettingsRow label={t('journal_section.history')} onClick={() => navigate('/echoes')} />
        </SettingsGroup>

        {/* Display — theme + language */}
        <SettingsGroup title={t('groups.display')}>
          <Choice
            label={t('display.theme')}
            options={THEMES}
            value={themePref}
            onChange={setThemePref}
            labelOf={(v) => t(`display.themes.${v}`)}
          />
          <Choice
            label={t('language.label')}
            options={LANGUAGES}
            value={(LANGUAGES as readonly string[]).includes(i18n.language.slice(0, 2)) ? (i18n.language.slice(0, 2) as (typeof LANGUAGES)[number]) : null}
            onChange={changeLanguage}
            labelOf={(lang) => t(`language.${lang}`)}
          />
        </SettingsGroup>

        {/* Understand & trust */}
        <SettingsGroup title={t('groups.about')}>
          <SettingsRow label={t('about.philosophy')} hint={t('about.philosophy_hint')} onClick={() => navigate('/info')} />
          <SettingsRow label={t('about.sources')} hint={t('about.sources_hint')} onClick={() => navigate('/info#sources')} />
          <SettingsRow label={t('about.data')} hint={t('about.data_hint')} onClick={() => setShowData((v) => !v)} />
          {showData && (
            <p className="px-[18px] pb-4 text-[13.5px] leading-relaxed text-ink-soft">{t('about.data_body')}</p>
          )}
          <SettingsRow label={t('about.version')} value={APP_VERSION} />
        </SettingsGroup>

        {/* Account */}
        <SettingsGroup title={t('account.title')}>
          {!showDeleteConfirm ? (
            <SettingsRow label={t('account.delete')} tone="warn" onClick={() => setShowDeleteConfirm(true)} />
          ) : (
            <div className="px-[18px] py-4">
              <p className="mb-3 text-[13.5px] text-danger">{t('account.delete_confirm')}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="min-h-[44px] flex-1 rounded-[10px] bg-warm-200 text-[13px] font-medium text-ink-soft"
                >
                  {tCommon('actions.cancel')}
                </button>
                <button
                  type="button"
                  onClick={deleteAccount}
                  disabled={deleting}
                  className="min-h-[44px] flex-1 rounded-[10px] text-[13px] font-medium text-warm-50 disabled:opacity-50"
                  style={{ background: 'var(--color-danger)' }}
                >
                  {t('account.delete_final')}
                </button>
              </div>
            </div>
          )}
        </SettingsGroup>

        <button
          type="button"
          onClick={logout}
          className="min-h-[48px] rounded-[14px] bg-warm-100 text-[14px] font-medium text-warm-500 transition-colors hover:bg-warm-200"
        >
          {tCommon('logout')}
        </button>
      </div>
    </div>
  );
}
