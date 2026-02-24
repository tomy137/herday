import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? 'currentColor' : 'currentColor';
  const weight = active ? 2.2 : 1.5;

  if (name === 'home') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        {active && <path d="M9 21V13h6v8" fill="currentColor" opacity="0.15" stroke="none" />}
      </svg>
    );
  }
  if (name === 'calendar') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        {active && <rect x="3" y="10" width="18" height="12" rx="0" fill="currentColor" opacity="0.1" stroke="none" />}
      </svg>
    );
  }
  // settings
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
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
    { to: '/settings', name: 'settings', label: t('nav.settings') },
  ];

  return (
    <div className="min-h-screen bg-warm-50 md:bg-warm-200/40 md:flex md:justify-center">
      <div className="mx-auto max-w-md md:max-w-lg min-h-screen flex flex-col md:shadow-2xl md:shadow-black/8 md:bg-warm-50 md:border-x md:border-warm-200/60 md:overflow-hidden">
        <main className="flex-1 pb-20 overflow-y-auto">
          <Outlet />
        </main>
        <nav className="fixed bottom-0 left-0 right-0 md:sticky md:bottom-auto bg-white/80 backdrop-blur-xl border-t border-warm-200/60">
          <div className="mx-auto max-w-md md:max-w-lg flex justify-around">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center py-3 px-6 text-[11px] font-medium tracking-wide transition-all duration-200 ${
                    isActive ? 'text-[#DC3D5A]' : 'text-warm-400 hover:text-warm-500'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="mb-1">
                      <NavIcon name={item.name} active={isActive} />
                    </span>
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
