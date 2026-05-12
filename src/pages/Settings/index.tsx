import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../../components/ui';

export default function Settings() {
  const navigate = useNavigate();

  useEffect(() => { document.title = 'Account — NetWorth Tracker'; }, []);

  const settingsMenu = [
    {
      icon: '🔄',
      title: 'Account',
      description: 'Sync and account settings',
      path: '/settings/account',
    },
    {
      icon: '🔑',
      title: 'API Configuration',
      description: 'Manage API keys and providers',
      path: '/settings/apis',
    },
    {
      icon: '💱',
      title: 'Currency',
      description: 'Set default currency and exchange rates',
      path: '/settings/currency',
    },
    {
      icon: '🏷️',
      title: 'Categories',
      description: 'Manage transaction categories',
      path: '/settings/categories',
    },
    {
      icon: '💳',
      title: 'Cards',
      description: 'Manage payment cards and accounts',
      path: '/settings/cards',
    },
    {
      icon: '🏦',
      title: 'Assets & Liabilities',
      description: 'Manage manual entries for net worth',
      path: '/settings/assets',
    },
    {
      icon: '💾',
      title: 'Backup & Reset',
      description: 'Data management and reset options',
      path: '/settings/backup',
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          title="Back to Dashboard"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Account</h1>
          <p className="text-white/50">Manage your app configuration and data</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {settingsMenu.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="group"
          >
            <GlassCard padding="lg" className="h-full hover:border-white/20 transition-all hover:bg-white/8 cursor-pointer">
              <div className="flex items-start gap-3">
                <span className="text-2xl group-hover:scale-110 transition-transform">{item.icon}</span>
                <div className="text-left flex-1 min-w-0">
                  <h3 className="font-semibold text-white group-hover:text-[#00E600] transition-colors">{item.title}</h3>
                  <p className="text-white/50 text-sm mt-0.5">{item.description}</p>
                </div>
                <svg className="w-4 h-4 text-white/30 group-hover:text-white group-hover:translate-x-1 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </GlassCard>
          </button>
        ))}
      </div>
    </div>
  );
}
