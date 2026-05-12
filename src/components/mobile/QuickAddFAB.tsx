import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuickAddStore } from '../../stores/quickAddStore';
import { NavIcon } from '../layout/NavIcons';

type QuickActionKey = 'expense' | 'income' | 'trade';

function QuickActionIcon({ action }: { action: QuickActionKey }) {
  if (action === 'trade') {
    return <NavIcon name="portfolio" className="w-5 h-5" />;
  }

  if (action === 'income') {
    return (
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 19V5" />
        <path d="M7 10l5-5 5 5" />
      </svg>
    );
  }

  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14" />
      <path d="M7 14l5 5 5-5" />
    </svg>
  );
}

const actions = [
  {
    key: 'expense' as const,
    label: 'Expense',
    sublabel: 'Log spending',
    route: '/spending',
    accent: '#FF5555',
  },
  {
    key: 'income' as const,
    label: 'Income',
    sublabel: 'Add income',
    route: '/spending',
    accent: '#D6F377',
  },
  {
    key: 'trade' as const,
    label: 'Trade',
    sublabel: 'Log a position',
    route: '/portfolio',
    accent: '#D6F377',
  },
];

// FAB sits 96px above the viewport bottom (clears 80px floating nav + 16px gap)
const FAB_BOTTOM = 'calc(env(safe-area-inset-bottom) + 96px)';
// Actions stack starts just above the FAB
const ACTIONS_BOTTOM = 'calc(env(safe-area-inset-bottom) + 164px)';

export function QuickAddFAB() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const setTarget = useQuickAddStore((s) => s.setTarget);
  const navigate = useNavigate();
  const location = useLocation();
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  // Hide FAB on settings page
  const isSettings = location.pathname.startsWith('/settings');

  // Always show when route changes
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(true);
      setOpen(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  // Same scroll-direction logic as MobileNav
  useEffect(() => {
    const scroller = document.querySelector('main.flex-1.overflow-y-auto') as HTMLElement | null;
    if (!scroller) return;

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        const y = scroller.scrollTop;
        const delta = y - lastScrollY.current;
        if (Math.abs(delta) > 6) {
          setVisible(delta < 0 || y < 60);
          lastScrollY.current = y;
        }
        ticking.current = false;
      });
    };

    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

  const handleAction = (key: QuickActionKey, route: string) => {
    setOpen(false);
    setTarget(key);
    if (location.pathname !== route) navigate(route);
  };

  if (isSettings) return null;

  const showFAB = visible || open; // keep visible while menu is open

  return (
    <>
      {/* ── Blurred backdrop ── */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            animation: 'backdrop-in 220ms ease both',
          }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Action cards — spring stagger from bottom ── */}
      {open && (
        <div
          className="fixed right-4 z-50 flex flex-col gap-2.5 items-end"
          style={{ bottom: ACTIONS_BOTTOM }}
        >
          {[...actions].reverse().map((action, i) => (
            <button
              key={action.key}
              onClick={() => handleAction(action.key, action.route)}
              className={`fab-action-${i + 1} flex items-center gap-3 pl-3 pr-5 py-2.5 rounded-2xl active:scale-95`}
              style={{
                background: 'rgba(10, 10, 10, 0.96)',
                border: `1px solid ${action.accent}28`,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: `0 8px 28px rgba(0,0,0,0.45), 0 0 0 1px ${action.accent}14`,
                transition: 'transform 150ms ease, box-shadow 150ms ease',
              }}
            >
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${action.accent}1a`, color: action.accent }}
              >
                <QuickActionIcon action={action.key} />
              </span>
              <div className="text-left">
                <p className="text-sm font-semibold text-white leading-tight">{action.label}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{action.sublabel}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── FAB button ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Quick add"
        className="fixed z-50 w-14 h-14 rounded-full flex items-center justify-center"
        style={{
          right: '16px',
          bottom: FAB_BOTTOM,
          background: 'linear-gradient(145deg, var(--color-accent), #009900)',
          boxShadow: open
            ? '0 4px 16px rgba(0, 230, 0, 0.30)'
            : '0 8px 28px rgba(0, 230, 0, 0.45)',
          opacity: showFAB ? 1 : 0,
          translate: showFAB ? '0 0' : '0 16px',
          transition: showFAB
            ? 'opacity 420ms cubic-bezier(0.22,1,0.36,1), translate 420ms cubic-bezier(0.22,1,0.36,1), box-shadow 250ms ease'
            : 'opacity 220ms ease, translate 220ms ease, box-shadow 250ms ease',
          pointerEvents: showFAB ? 'auto' : 'none',
        }}
        onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.91)')}
        onPointerUp={(e) => (e.currentTarget.style.transform = '')}
        onPointerLeave={(e) => (e.currentTarget.style.transform = '')}
      >
        <svg
          className="w-7 h-7 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{
            transition: 'transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </>
  );
}
