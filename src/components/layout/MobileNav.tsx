import { useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { NavIcon } from './NavIcons';

const navItems = [
  { to: '/dashboard', label: 'Home', icon: 'dashboard' as const },
  { to: '/portfolio', label: 'Portfolio', icon: 'portfolio' as const },
  { to: '/spending',  label: 'Spending', icon: 'spending' as const },
  { to: '/fire',      label: 'FIRE', icon: 'fire' as const },
];

export function MobileNav() {
  const location = useLocation();
  const lastTapRef = useRef<{ path: string; time: number }>({ path: '', time: 0 });

  // Match active tab — startsWith handles sub-routes
  const activeIndex = Math.max(
    0,
    navItems.findIndex(
      (item) =>
        location.pathname === item.to ||
        location.pathname.startsWith(item.to + '/')
    )
  );

  const handleNavTap = (path: string) => {
    const now = new Date().getTime();
    const last = lastTapRef.current;
    if (last.path === path && now - last.time < 350) {
      // Double-tap on active tab → scroll to top
      const scroller = document.querySelector('main.flex-1.overflow-y-auto') as HTMLElement | null;
      scroller?.scrollTo({ top: 0, behavior: 'smooth' });
      lastTapRef.current = { path: '', time: 0 };
    } else {
      lastTapRef.current = { path, time: now };
    }
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 flex justify-center px-0"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom))',
        transform: `translateZ(0)`,
        WebkitTransform: `translateZ(0)`,
      }}
    >
      <nav
        className="relative flex h-[70px] w-full items-start justify-center border-t border-[#525252] bg-[var(--bg)]"
        style={{ height: '70px' }}
      >
        {navItems.map((item, i) => {
          const isActive = i === activeIndex;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative flex h-[70px] flex-1 basis-0 flex-col items-center justify-center gap-0.5 overflow-hidden text-center"
              style={{ flex: '1 1 0%' }}
              onClick={() => handleNavTap(item.to)}
            >
              {isActive && (
                <span className="absolute left-4 right-4 top-0 h-0.5 bg-white" />
              )}

              <span
                className="flex items-center justify-center transform origin-center"
                style={{
                  opacity: isActive ? 1 : 0.42,
                  transform: 'scale(0.8)'
                }}
              >
                <NavIcon name={item.icon} className="h-[24px] w-[24px] flex-shrink-0" />
              </span>

              <span
                className="w-full overflow-hidden text-center whitespace-nowrap"
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  letterSpacing: '0',
                  fontFamily: 'Favorit Mono, monospace',
                  color: isActive ? '#FFFFFF' : '#A3A3A3',
                  lineHeight: '16px',
                }}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
