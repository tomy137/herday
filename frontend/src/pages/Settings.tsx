// SPDX-License-Identifier: AGPL-3.0-or-later
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Event } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import Header from '../components/layout/Header';
import SettingsGroup from '../components/settings/SettingsGroup';
import SettingsRow from '../components/settings/SettingsRow';

const LANGUAGES = ['fr', 'en', 'de'] as const;
const APP_VERSION = '2.0.0-alpha';

export default function Settings() {
  const { t, i18n } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [events, setEvents] = useState<Event[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.events.list(0, 100).then((d) => setEvents(d.items)).catch(() => {});
  }, []);

  const changeLanguage = async (lang: string) => {
    await i18n.changeLanguage(lang);
    api.users.update({ locale: lang }).catch(() => {});
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
      <div className="flex flex-col gap-[22px] px-[22px] pb-6 pt-2">
        <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink">{t('title')}</h1>

        {/* Transparency pact */}
        <SettingsGroup
          title={t('transparency.group')}
          status={status !== 'not_yet' ? t('transparency.status_label') : undefined}
        >
          <div className="px-[18px] py-4">
            <div className="hd-caps mb-2" style={{ color: status !== 'not_yet' ? 'var(--color-phase-pre-ovulatory)' : 'var(--color-warm-500)' }}>
              {status !== 'not_yet' ? '✓ ' : ''}{statusLabel}
            </div>
            <p className="text-[13.5px] leading-relaxed text-ink-soft">{t('transparency.body')}</p>
          </div>
          {status !== 'told_already' && (
            <SettingsRow label={t('transparency.mark_told')} hint={t('transparency.mark_told_hint')} onClick={markTold} />
          )}
        </SettingsGroup>

        {/* Her data */}
        <SettingsGroup title={t('groups.her_data')}>
          <SettingsRow label={t('partner_name.label')} value={user?.partner_name ?? '—'} />
          <SettingsRow label={t('her_data.last_period')} value={lastPeriod ?? '—'} />
        </SettingsGroup>

        {/* Journal */}
        <SettingsGroup title={t('groups.journal')}>
          <SettingsRow label={t('journal_section.history')} hint={`${events.length}`} onClick={() => navigate('/journal')} />
        </SettingsGroup>

        {/* Display — language */}
        <SettingsGroup title={t('groups.display')}>
          <div className="px-[18px] py-3.5">
            <div className="mb-2.5 text-[14px] text-ink">{t('language.label')}</div>
            <div className="flex gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => changeLanguage(lang)}
                  className={`flex-1 rounded-[10px] py-2 text-[13px] font-medium transition-colors ${
                    i18n.language === lang ? 'bg-ink text-warm-50' : 'bg-warm-100 text-warm-500 hover:bg-warm-200'
                  }`}
                >
                  {t(`language.${lang}`)}
                </button>
              ))}
            </div>
          </div>
        </SettingsGroup>

        {/* About */}
        <SettingsGroup title={t('groups.about')}>
          <SettingsRow label={t('about.philosophy')} onClick={() => navigate('/info')} />
          <SettingsRow label={t('about.sources')} hint={t('about.sources_hint')} />
          <SettingsRow label={t('about.version')} value={APP_VERSION} />
        </SettingsGroup>

        {/* Account */}
        <SettingsGroup title={t('account.title')}>
          {!showDeleteConfirm ? (
            <SettingsRow label={t('account.delete')} tone="warn" onClick={() => setShowDeleteConfirm(true)} />
          ) : (
            <div className="px-[18px] py-4">
              <p className="mb-3 text-[13.5px] text-phase-menstruation">{t('account.delete_confirm')}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-[10px] bg-warm-100 py-2.5 text-[13px] font-medium text-warm-500"
                >
                  {tCommon('actions.cancel')}
                </button>
                <button
                  type="button"
                  onClick={deleteAccount}
                  disabled={deleting}
                  className="flex-1 rounded-[10px] py-2.5 text-[13px] font-medium text-warm-50 disabled:opacity-50"
                  style={{ background: 'var(--color-phase-menstruation)' }}
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
          className="rounded-[10px] bg-warm-100 py-3 text-[14px] font-medium text-warm-500 transition-colors hover:bg-warm-200"
        >
          {tCommon('logout')}
        </button>
      </div>
    </div>
  );
}
