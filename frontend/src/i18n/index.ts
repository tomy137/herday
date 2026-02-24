import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// FR
import frCommon from './locales/fr/common.json';
import frDashboard from './locales/fr/dashboard.json';
import frCalendar from './locales/fr/calendar.json';
import frEvents from './locales/fr/events.json';
import frTips from './locales/fr/tips.json';
import frAuth from './locales/fr/auth.json';
import frSettings from './locales/fr/settings.json';
import frInfo from './locales/fr/info.json';

// EN
import enCommon from './locales/en/common.json';
import enDashboard from './locales/en/dashboard.json';
import enCalendar from './locales/en/calendar.json';
import enEvents from './locales/en/events.json';
import enTips from './locales/en/tips.json';
import enAuth from './locales/en/auth.json';
import enSettings from './locales/en/settings.json';
import enInfo from './locales/en/info.json';

// DE
import deCommon from './locales/de/common.json';
import deDashboard from './locales/de/dashboard.json';
import deCalendar from './locales/de/calendar.json';
import deEvents from './locales/de/events.json';
import deTips from './locales/de/tips.json';
import deAuth from './locales/de/auth.json';
import deSettings from './locales/de/settings.json';
import deInfo from './locales/de/info.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: {
        common: frCommon,
        dashboard: frDashboard,
        calendar: frCalendar,
        events: frEvents,
        tips: frTips,
        auth: frAuth,
        settings: frSettings,
        info: frInfo,
      },
      en: {
        common: enCommon,
        dashboard: enDashboard,
        calendar: enCalendar,
        events: enEvents,
        tips: enTips,
        auth: enAuth,
        settings: enSettings,
        info: enInfo,
      },
      de: {
        common: deCommon,
        dashboard: deDashboard,
        calendar: deCalendar,
        events: deEvents,
        tips: deTips,
        auth: deAuth,
        settings: deSettings,
        info: deInfo,
      },
    },
    fallbackLng: 'fr',
    ns: ['common', 'dashboard', 'calendar', 'events', 'tips', 'auth', 'settings', 'info'],
    defaultNS: 'common',
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
