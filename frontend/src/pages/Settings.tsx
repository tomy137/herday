import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Event } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { getEventType, getEventIcon } from '../constants/event-types';

const LANGUAGES = [
  { code: 'fr', labelKey: 'language.fr' },
  { code: 'en', labelKey: 'language.en' },
  { code: 'de', labelKey: 'language.de' },
] as const;

export default function Settings() {
  const { t, i18n } = useTranslation('settings');
  const { t: tCommon } = useTranslation('common');
  const { t: tEvents } = useTranslation('events');
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await api.events.list(0, 100);
        setEvents(data.items);
      } catch {
        // ignore
      } finally {
        setLoadingEvents(false);
      }
    };
    fetchEvents();
  }, []);

  const handleLanguageChange = async (lang: string) => {
    await i18n.changeLanguage(lang);
    try {
      await api.users.update({ locale: lang });
    } catch {
      // ignore -- language already changed client-side
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm(t('events_history.delete_confirm'))) return;
    try {
      await api.events.delete(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      showToast(tEvents('deleted'));
    } catch {
      showToast(tCommon('error'), 'error');
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await api.users.delete();
      await logout();
    } catch {
      showToast(tCommon('error'), 'error');
      setDeletingAccount(false);
    }
  };

  const getEventLabel = (eventType: string): string => {
    const def = getEventType(eventType);
    if (!def) return eventType;
    return tEvents(def.labelKey.replace('events:', ''));
  };

  return (
    <div className="p-5 space-y-5">
      <h1 className="text-xl font-bold text-gray-900 tracking-tight pt-1">{t('title')}</h1>

      {/* Language selector */}
      <section className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-warm-200/40">
        <label className="block text-sm font-semibold text-gray-800 mb-3">
          {t('language.label')}
        </label>
        <div className="flex gap-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-[0.97] ${
                i18n.language === lang.code
                  ? 'bg-gradient-to-r from-[#DC3D5A] to-[#E8647D] text-white shadow-sm'
                  : 'bg-warm-100 text-warm-500 hover:bg-warm-200'
              }`}
            >
              {t(lang.labelKey)}
            </button>
          ))}
        </div>
      </section>

      {/* Events history */}
      <section className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-warm-200/40">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">{t('events_history.title')}</h2>
        {loadingEvents ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl loading-shimmer" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-warm-400 py-4 text-center">{t('events_history.empty')}</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between py-2.5 px-4 rounded-xl bg-warm-50 border border-warm-200/40 transition-all hover:border-warm-300/60"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {getEventIcon(event.event_type)} {getEventLabel(event.event_type)}
                  </p>
                  <p className="text-xs text-warm-400 mt-0.5">{event.event_date}</p>
                </div>
                <button
                  onClick={() => handleDeleteEvent(event.id)}
                  className="text-[#DC3D5A]/60 hover:text-[#DC3D5A] text-xs font-semibold transition-colors"
                >
                  {tCommon('actions.delete')}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Account section */}
      <section className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-warm-200/40">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">{t('account.title')}</h2>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-3 rounded-xl text-[#DC3D5A]/70 border border-[#DC3D5A]/15 font-semibold hover:bg-[#DC3D5A]/5 transition-all duration-200"
          >
            {t('account.delete')}
          </button>
        ) : (
          <div className="space-y-3 animate-fade-in-up">
            <p className="text-sm text-[#DC3D5A]">{t('account.delete_confirm')}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-warm-100 text-warm-500 font-semibold hover:bg-warm-200 transition-all duration-200"
              >
                {tCommon('actions.cancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#DC3D5A] to-[#E8647D] text-white font-semibold shadow-sm disabled:opacity-50 transition-all duration-200"
              >
                {t('account.delete_final')}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* More info */}
      <button
        onClick={() => navigate('/info')}
        className="w-full py-3 rounded-xl bg-warm-100 text-warm-500 font-semibold hover:bg-warm-200 transition-all duration-200 active:scale-[0.98]"
      >
        {t('more_info')}
      </button>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full py-3 rounded-xl bg-warm-100 text-warm-500 font-semibold hover:bg-warm-200 transition-all duration-200 active:scale-[0.98]"
      >
        {tCommon('logout')}
      </button>
    </div>
  );
}
