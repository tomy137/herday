import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ICONS: Record<string, string> = {
  home: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 12l4-4',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  note: 'M12 5v14M5 12h14',
  carnet: 'M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z',
  settings: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M14 4v4M8 10v4M16 16v4',
};

function NavIcon({ name }: { name: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

export default function AppShell() {
  const { t } = useTranslation();

  const navItems = [
    { to: '/', name: 'home', label: t('nav.today') },
    { to: '/calendar', name: 'calendar', label: t('nav.calendar') },
    { to: '/journal', name: 'note', label: t('nav.note'), center: true },
    { to: '/echoes', name: 'carnet', label: t('nav.carnet') },
    { to: '/settings', name: 'settings', label: t('nav.settings') },
  ];

  return (
    <div className="min-h-screen bg-warm-50 md:flex md:justify-center">
      <div className="mx-auto flex min-h-screen max-w-md flex-col md:max-w-lg md:overflow-hidden md:border-x md:border-warm-300/60 md:bg-warm-50">
        <main className="flex-1 overflow-y-auto pb-28">
          <Outlet />
        </main>
        <nav
          aria-label={t('nav.label')}
          className="fixed bottom-0 left-0 right-0 px-3 pb-6 pt-2 md:sticky md:bottom-auto"
          style={{ background: 'linear-gradient(to top, var(--color-warm-50) 70%, transparent)' }}
        >
          <div className="mx-auto grid max-w-md grid-cols-5 items-center rounded-[26px] border border-warm-300 bg-warm-100/95 p-1.5 backdrop-blur-xl md:max-w-lg">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                aria-label={item.label}
                className={({ isActive }) =>
                  `flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-[20px] text-[10px] tracking-wide transition-colors ${
                    item.center || isActive ? 'text-ink' : 'text-warm-500 hover:text-ink'
                  }`
                }
              >
                {item.center ? (
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-warm-50">
                    <NavIcon name={item.name} />
                  </span>
                ) : (
                  <NavIcon name={item.name} />
                )}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
