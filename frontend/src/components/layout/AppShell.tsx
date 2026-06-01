import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function NavIcon({ name }: { name: string }) {
  const sw = 1.5;
  if (name === 'home') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      </svg>
    );
  }
  if (name === 'calendar') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    );
  }
  if (name === 'echoes') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12a8 8 0 1 1-2.34-5.66" />
        <path d="M20 4v4h-4" />
      </svg>
    );
  }
  // settings
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

export default function AppShell() {
  const { t } = useTranslation();

  const navItems = [
    { to: '/', name: 'home', label: t('nav.today') },
    { to: '/calendar', name: 'calendar', label: t('nav.calendar') },
    { to: '/echoes', name: 'echoes', label: t('nav.echoes') },
    { to: '/settings', name: 'settings', label: t('nav.settings') },
  ];

  return (
    <div className="min-h-screen bg-warm-50 md:bg-warm-200/40 md:flex md:justify-center">
      <div className="mx-auto flex min-h-screen max-w-md flex-col md:max-w-lg md:overflow-hidden md:border-x md:border-warm-200/60 md:bg-warm-50 md:shadow-2xl md:shadow-black/8">
        <main className="flex-1 overflow-y-auto pb-24">
          <Outlet />
        </main>
        <nav className="fixed bottom-0 left-0 right-0 border-t border-warm-300/70 bg-warm-50/90 backdrop-blur-xl md:sticky md:bottom-auto">
          <div className="mx-auto grid max-w-md grid-cols-4 gap-1 px-3 pb-6 pt-2.5 md:max-w-lg">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 rounded-lg py-2 text-[10px] tracking-wide transition-colors ${
                    isActive ? 'text-ink' : 'text-warm-400 hover:text-warm-500'
                  }`
                }
              >
                <NavIcon name={item.name} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
