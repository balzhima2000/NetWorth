
import { NavLink, useLocation } from 'react-router-dom';
import { useSettingsStore } from '../../stores/settingsStore';
import { APP_NAME } from '../../utils/constants';
import { NavIcon } from './NavIcons';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' as const },
  { to: '/portfolio', label: 'Portfolio', icon: 'portfolio' as const },
  { to: '/spending',  label: 'Spending',  icon: 'spending' as const },
  { to: '/fire',      label: 'FIRE',      icon: 'fire' as const },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const nickname = useSettingsStore((s) => s.userNickname);
  const location = useLocation();

  return (
    <aside
      className={`flex flex-col h-full bg-[#080808] border-r border-white/[0.07] transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/[0.07] flex-shrink-0 ${collapsed ? 'justify-center px-0' : ''}`}>
        {/* Logomark — emerald gradient, monochromatic and premium */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D6F377] to-[#B8DC4A] flex items-center justify-center text-[#1f1f1f] font-bold text-sm flex-shrink-0 shadow-md shadow-black/35">
          W
        </div>
        {!collapsed && (
          <span className="font-bold text-white text-base tracking-tight">{APP_NAME}</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={`
                relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 text-sm font-medium
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6F377]/40 focus-visible:ring-inset
                ${collapsed ? 'justify-center' : ''}
                ${isActive
                  ? 'bg-[#D6F377]/[0.12] text-[#D6F377]'
                  : 'text-white/45 hover:text-white/80 hover:bg-white/[0.05]'
                }
              `}
            >
              {/* Left accent bar for active item */}
              {isActive && (
                <span className="absolute left-0 top-2.5 bottom-2.5 w-0.5 bg-[#D6F377] rounded-full" />
              )}
              <NavIcon name={item.icon} />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User footer */}
      {!collapsed && nickname && (
        <div className="px-4 py-4 border-t border-white/[0.07] flex-shrink-0">
          <p className="text-[10px] text-white/20 uppercase tracking-wider font-medium mb-0.5">Signed in as</p>
          <p className="text-sm text-white/55 font-medium truncate">{nickname}</p>
        </div>
      )}
    </aside>
  );
}
