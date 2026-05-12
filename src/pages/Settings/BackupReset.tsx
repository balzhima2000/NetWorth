import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../../stores/settingsStore';
import { useToast } from '../../hooks/useToast';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useBudgetStore } from '../../stores/budgetStore';
import { useNetWorthStore } from '../../stores/networthStore';
import { useCardsStore } from '../../stores/cardsStore';
import { useRecurringStore } from '../../stores/recurringStore';
import { useCategoriesStore } from '../../stores/categoriesStore';
import { useAllocationStore } from '../../stores/allocationStore';
import { GlassCard, Button, Modal } from '../../components/ui';
import { formatDate } from '../../utils/formatters';
import { exportFullBackup, exportTransactionsCSV, parseBackup } from '../../services/exportImport';
import { supabase, supabaseConfigured } from '../../lib/supabase';
import { ALL_STORE_KEYS } from '../../utils/syncHelpers';
import type { FullBackup } from '../../services/exportImport';

export default function BackupResetSettings() {
  const navigate = useNavigate();
  const toast = useToast();
  
  useEffect(() => { document.title = 'Backup & Reset Settings — NetWorth Tracker'; }, []);

  const lastBackupDate = useSettingsStore((s) => s.lastBackupDate);
  const setLastBackupDate = useSettingsStore((s) => s.setLastBackupDate);
  const setHasCompletedSetup = useSettingsStore((s) => s.setHasCompletedSetup);

  const trades = usePortfolioStore((s) => s.trades);
  const transactions = useTransactionStore((s) => s.transactions);
  const budgets = useBudgetStore((s) => s.budgets);
  const manualEntries = useNetWorthStore((s) => s.manualEntries);
  const snapshots = useNetWorthStore((s) => s.snapshots);
  const cards = useCardsStore((s) => s.cards);
  const recurringPayments = useRecurringStore((s) => s.recurringPayments);
  const installmentPlans = useRecurringStore((s) => s.installmentPlans);
  const categories = useCategoriesStore((s) => s.categories);
  const incomeCategories = useCategoriesStore((s) => s.incomeCategories);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [importData, setImportData] = useState<FullBackup | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [showSoftResetConfirm, setShowSoftResetConfirm] = useState(false);
  const [showHardResetConfirm, setShowHardResetConfirm] = useState(false);
  const [clearText, setClearText] = useState('');

  const handleExportJSON = () => {
    exportFullBackup({
      trades, transactions, budgets,
      manualEntries, snapshots, cards, recurringPayments, installmentPlans,
      categories, incomeCategories, settings: {},
    });
    setLastBackupDate(new Date().toISOString());
    toast.success('Full backup downloaded.');
  };

  const handleExportCSV = () => {
    exportTransactionsCSV(transactions, cards);
    toast.success('Transactions CSV downloaded.');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { backup, error, summary } = parseBackup(text);
      if (error) { toast.error(`Import error: ${error}`); return; }
      setImportData(backup);
      setImportSummary(summary);
      setShowImportConfirm(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportConfirm = () => {
    if (!importData) return;
    if (importData.trades) usePortfolioStore.setState({ trades: importData.trades });
    if (importData.transactions) useTransactionStore.setState({ transactions: importData.transactions });
    if (importData.budgets) useBudgetStore.setState({ budgets: importData.budgets });
    if (importData.manualEntries && importData.snapshots) {
      useNetWorthStore.setState({ manualEntries: importData.manualEntries, snapshots: importData.snapshots });
    }
    if (importData.cards) useCardsStore.setState({ cards: importData.cards });
    if (importData.recurringPayments && importData.installmentPlans) {
      useRecurringStore.setState({ recurringPayments: importData.recurringPayments, installmentPlans: importData.installmentPlans });
    }
    if (importData.categories) {
      useCategoriesStore.setState({
        categories: importData.categories,
        ...(importData.incomeCategories ? { incomeCategories: importData.incomeCategories } : {}),
      });
    }
    setShowImportConfirm(false);
    setImportData(null);
    setImportSummary(null);
    toast.success('Data imported successfully.');
  };

  const clearAllStores = () => {
    usePortfolioStore.setState({ trades: [], currentPrices: {}, lastPriceUpdates: {}, priceSources: {} });
    useTransactionStore.setState({ transactions: [], lastUsedPaymentMethod: 'cash' });
    useBudgetStore.setState({ budgets: [], summaries: [] });
    useNetWorthStore.setState({ manualEntries: [], snapshots: [], lastSnapshotDate: null });
    useCardsStore.setState({ cards: [], incomeDestinations: [{ id: 'cash', name: 'Cash', icon: '💵' }] });
    useRecurringStore.setState({ recurringPayments: [], installmentPlans: [] });
    useAllocationStore.setState({ mode: 'none', targets: {} });
    ALL_STORE_KEYS.forEach(key => localStorage.removeItem(key));
  };

  const handleSoftReset = () => {
    clearAllStores();
    setHasCompletedSetup(false);
    setShowSoftResetConfirm(false);
  };

  const handleHardReset = async () => {
    if (clearText !== 'DELETE') return;
    clearAllStores();
    if (supabaseConfigured) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('sync_stores').delete().eq('user_id', user.id);
      }
    }
    setHasCompletedSetup(false);
    setShowHardResetConfirm(false);
    setClearText('');
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
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Backup & Reset</h1>
          <p className="text-white/50 text-sm mt-0.5">Manage your data backups and reset options</p>
        </div>
      </div>

      {/* ── DATA MANAGEMENT ── */}
      <GlassCard padding="lg">
        <h2 className="text-xl font-semibold text-white mb-4">💾 Data Management</h2>
        <div className="space-y-3">
          <Button variant="secondary" onClick={handleExportJSON} fullWidth>⬇️ Export Full Backup (JSON)</Button>
          <Button variant="secondary" onClick={handleExportCSV} fullWidth>📊 Export Transactions (CSV)</Button>
          <Button variant="ghost" onClick={() => fileInputRef.current?.click()} fullWidth>⬆️ Import Backup (JSON)</Button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileChange} />
          {lastBackupDate && (
            <p className="text-xs text-white/30 text-center">Last backup: {formatDate(lastBackupDate)}</p>
          )}
        </div>
      </GlassCard>

      {/* ── DANGER ZONE ── */}
      <GlassCard padding="lg" className="border border-[#FF5555]/20">
        <h2 className="text-xl font-semibold text-[#FF5555] mb-4">⚠️ Danger Zone</h2>
        <div className="space-y-3">
          <div className="p-4 bg-white/[0.03] rounded-xl border border-white/8">
            <p className="text-white font-medium text-sm mb-0.5">Reset This Device</p>
            <p className="text-white/40 text-xs mb-3">Clears all local data. Your cloud backup is preserved — sign back in to restore.</p>
            <Button variant="danger" size="sm" onClick={() => setShowSoftResetConfirm(true)}>Reset This Device</Button>
          </div>
          <div className="p-4 bg-white/[0.03] rounded-xl border border-white/8">
            <p className="text-white font-medium text-sm mb-0.5">Delete Everything</p>
            <p className="text-white/40 text-xs mb-3">Permanently deletes all data from this device and the cloud. Cannot be undone.</p>
            <Button variant="danger" size="sm" onClick={() => { setClearText(''); setShowHardResetConfirm(true); }}>Delete Everything</Button>
          </div>
        </div>
      </GlassCard>

      {/* IMPORT CONFIRM */}
      <Modal
        isOpen={showImportConfirm}
        onClose={() => setShowImportConfirm(false)}
        title="Import Backup"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowImportConfirm(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleImportConfirm}>Import & Replace</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-white/70">{importSummary}</p>
          <p className="text-amber-400 text-sm">⚠️ This will replace your existing data. Are you sure?</p>
        </div>
      </Modal>

      {/* SOFT RESET CONFIRM */}
      <Modal
        isOpen={showSoftResetConfirm}
        onClose={() => setShowSoftResetConfirm(false)}
        title="Reset This Device"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowSoftResetConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleSoftReset}>Reset This Device</Button>
          </>
        }
      >
        <p className="text-white/70">This will clear all data on this device. Your cloud backup is safe — sign back in to restore everything.</p>
      </Modal>

      {/* HARD RESET CONFIRM */}
      <Modal
        isOpen={showHardResetConfirm}
        onClose={() => setShowHardResetConfirm(false)}
        title="Delete Everything"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowHardResetConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleHardReset} disabled={clearText !== 'DELETE'}>Delete Everything</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-white/70">This will permanently delete <strong>all data</strong> from this device and the cloud. This action cannot be undone.</p>
          <div>
            <p className="text-white/50 text-sm mb-2">Type <span className="font-mono bg-white/10 px-1 rounded">DELETE</span> to confirm:</p>
            <input
              type="text"
              value={clearText}
              onChange={e => setClearText(e.target.value)}
              placeholder="Type DELETE"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#FF5555]/50"
              autoFocus
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
