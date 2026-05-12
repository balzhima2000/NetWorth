import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useSyncManager } from '../../hooks/useSyncManager';
import { GlassCard, Button } from '../../components/ui';

export default function AccountSettings() {
  const navigate = useNavigate();
  const { user, sendMagicLink, verifyOtp, signOut } = useAuth();
  const { syncStatus, lastSyncedAt, forcePull, forcePush } = useSyncManager();
  const [syncEmail, setSyncEmail] = useState('');
  const [syncEmailSent, setSyncEmailSent] = useState(false);
  const [syncEmailError, setSyncEmailError] = useState<string | null>(null);
  const [syncEmailLoading, setSyncEmailLoading] = useState(false);
  const [syncCode, setSyncCode] = useState('');
  const [syncCodeVerifying, setSyncCodeVerifying] = useState(false);

  useEffect(() => { document.title = 'Account Settings — NetWorth Tracker'; }, []);

  const handleSendCode = async () => {
    if (!syncEmail.trim()) return;
    setSyncEmailLoading(true);
    setSyncEmailError(null);
    const { error } = await sendMagicLink(syncEmail.trim());
    setSyncEmailLoading(false);
    if (error) {
      setSyncEmailError(error);
    } else {
      setSyncEmailSent(true);
    }
  };

  const handleVerifyCode = async () => {
    if (!syncCode.trim()) return;
    setSyncCodeVerifying(true);
    setSyncEmailError(null);
    const { error } = await verifyOtp(syncEmail.trim(), syncCode.trim());
    setSyncCodeVerifying(false);
    if (error) setSyncEmailError(error);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          title="Back to Settings"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Account</h1>
          <p className="text-white/50 text-sm mt-0.5">Manage sync and account settings</p>
        </div>
      </div>

      <GlassCard padding="lg">
        <h2 className="text-xl font-semibold text-white mb-4">🔄 Sync &amp; Account</h2>

        {user ? (
          /* Signed in */
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/8">
              <div className="w-8 h-8 rounded-full bg-[#5865f2]/20 flex items-center justify-center text-sm">
                {user.email?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{user.email}</p>
                <p className="text-white/40 text-xs">
                  {syncStatus === 'syncing' && 'Syncing…'}
                  {syncStatus === 'idle' && lastSyncedAt && `Last synced ${lastSyncedAt.toLocaleTimeString()}`}
                  {syncStatus === 'idle' && !lastSyncedAt && 'Not synced yet'}
                  {syncStatus === 'error' && 'Sync error — will retry'}
                  {syncStatus === 'offline' && 'Offline — will sync when reconnected'}
                </p>
              </div>
              {syncStatus === 'syncing' && (
                <div className="w-4 h-4 border-2 border-[#5865f2] border-t-transparent rounded-full animate-spin" />
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button variant="secondary" size="sm" onClick={() => void forcePull()}>
                Pull from cloud
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void forcePush()}>
                Push to cloud
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void signOut()}>
                Sign out
              </Button>
            </div>
          </div>
        ) : syncEmailSent ? (
          /* OTP / magic link sent */
          <div className="space-y-3">
            <p className="text-white/60 text-sm">
              A sign-in email was sent to <span className="text-white font-medium">{syncEmail}</span>. Click the link — or enter the code below.
            </p>
            <div className="flex gap-2 flex-wrap items-start">
              <div className="flex-1 min-w-[140px]">
                <input
                  type="text"
                  placeholder="Enter code from email"
                  value={syncCode}
                  onChange={(e) => setSyncCode(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleVerifyCode(); }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#00E600]/50"
                />
              </div>
              <Button
                variant="secondary"
                size="md"
                onClick={() => void handleVerifyCode()}
                disabled={!syncCode.trim() || syncCodeVerifying}
              >
                {syncCodeVerifying ? 'Verifying…' : 'Verify'}
              </Button>
            </div>
            {syncEmailError && <p className="text-[#FF5555] text-xs">{syncEmailError}</p>}
            <p className="text-white/30 text-xs">
              Didn't get it? Check spam or{' '}
              <button
                className="text-white/50 underline hover:text-white transition-colors"
                onClick={() => { setSyncEmailSent(false); setSyncCode(''); setSyncEmailError(null); }}
              >
                try again
              </button>.
            </p>
          </div>
        ) : (
          /* Signed out */
          <div className="space-y-4">
            <p className="text-white/50 text-sm">
              Sign in with your email to sync your data across devices. No password needed.
            </p>
            <div className="flex gap-2 flex-wrap items-start">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={syncEmail}
                  onChange={(e) => setSyncEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleSendCode(); }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#00E600]/50"
                />
                {syncEmailError && <p className="text-[#FF5555] text-xs mt-1">{syncEmailError}</p>}
              </div>
              <Button
                variant="secondary"
                size="md"
                onClick={() => void handleSendCode()}
                disabled={!syncEmail.trim() || syncEmailLoading}
              >
                {syncEmailLoading ? 'Sending…' : 'Send Link'}
              </Button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
