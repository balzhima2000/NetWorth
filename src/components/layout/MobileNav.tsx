import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', label: 'Home',     icon: '🏠' },
  { to: '/portfolio', label: 'Portfolio', icon: '💼' },
  { to: '/spending',  label: 'Spending',  icon: '💳' },
  { to: '/fire',      label: 'FIRE',      icon: '🔥' },
  { to: '/settings',  label: 'Settings',  icon: '⚙️' },
];

export function MobileNav() {
  const location = useLocation();

  // Match active tab — startsWith handles sub-routes
  const activeIndex = Math.max(
    0,
    navItems.findIndex(
      (item) =>
        location.pathname === item.to ||
        location.pathname.startsWith(item.to + '/')
    )
  );

  return (
    /* Fixed floating pill — sits 10px above the safe area */
    <div
      className="fixed bottom-0 left-0 right-0 z-30 px-3"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}
    >
      <nav
        className="mobile-nav-pill relative flex items-center rounded-[20px]"
        style={{ height: '62px' }}
      >
        {/* ── Spring-sliding indicator blob ── */}
        <div
          className="nav-indicator"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        />

        {/* ── Tab items ── */}
        {navItems.map((item, i) => {
          const isActive = i === activeIndex;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className="relative z-10 flex flex-col items-center justify-center gap-0.5"
              style={{ flex: 1, height: '100%' }}
            >
              {/* Icon — springs up on active */}
              <span
                className={isActive ? 'nav-icon-active' : 'nav-icon-idle'}
                style={{
                  fontSize: '20px',
                  lineHeight: 1,
                  opacity: isActive ? 1 : 0.42,
                  display: 'block',
                }}
              >
                {item.icon}
              </span>

              {/* Label — only visible on active tab, slides up */}
              <span
                className={isActive ? 'nav-label-active' : ''}
                style={{
                  fontSize: '10px',
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                  color: isActive ? 'rgba(255,255,255,0.85)' : 'transparent',
                  lineHeight: 1,
                  maxHeight: isActive ? '14px' : '0px',
                  overflow: 'hidden',
                  /* Don't transition color — let animation handle it */
                  transition: 'max-height 300ms ease',
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
