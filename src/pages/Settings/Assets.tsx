import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNetWorthStore } from '../../stores/networthStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { GlassCard, Button, Modal } from '../../components/ui';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { MANUAL_ASSET_CATEGORIES, MANUAL_LIABILITY_CATEGORIES } from '../../utils/constants';
import type { ManualEntry } from '../../types/index';

export default function AssetsSettings() {
  const navigate = useNavigate();
  
  useEffect(() => { document.title = 'Assets & Liabilities Settings — NetWorth Tracker'; }, []);

  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);
  const manualEntries = useNetWorthStore((s) => s.manualEntries);
  const addManualEntry = useNetWorthStore((s) => s.addManualEntry);
  const updateManualEntry = useNetWorthStore((s) => s.updateManualEntry);
  const deleteManualEntry = useNetWorthStore((s) => s.deleteManualEntry);

  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ManualEntry | null>(null);
  const [entryIsLiability, setEntryIsLiability] = useState(false);
  const [entryName, setEntryName] = useState('');
  const [entryValue, setEntryValue] = useState('');
  const [entryCategory, setEntryCategory] = useState('');
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);

  const openAddEntry = (isLiability: boolean) => {
    setEditingEntry(null);
    setEntryIsLiability(isLiability);
    setEntryName('');
    setEntryValue('');
    setEntryCategory(isLiability ? MANUAL_LIABILITY_CATEGORIES[0].id : MANUAL_ASSET_CATEGORIES[0].id);
    setShowEntryModal(true);
  };

  const openEditEntry = (entry: ManualEntry) => {
    setEditingEntry(entry);
    setEntryIsLiability(entry.isLiability);
    setEntryName(entry.name);
    setEntryValue(String(entry.value));
    setEntryCategory(entry.assetCategory);
    setShowEntryModal(true);
  };

  const handleSaveEntry = () => {
    if (!entryName || !entryValue) return;
    const today = new Date().toISOString();
    if (editingEntry) {
      updateManualEntry(editingEntry.id, { name: entryName, value: parseFloat(entryValue), assetCategory: entryCategory });
    } else {
      addManualEntry({ id: crypto.randomUUID(), name: entryName, value: parseFloat(entryValue), isLiability: entryIsLiability, assetCategory: entryCategory, lastUpdated: today });
    }
    setShowEntryModal(false);
  };

  const assets = manualEntries.filter((e) => !e.isLiability);
  const liabilities = manualEntries.filter((e) => e.isLiability);

  const assetCatOptions = MANUAL_ASSET_CATEGORIES.map(c => ({ value: c.id, label: `${c.emoji} ${c.label}` }));
  const liabilityCatOptions = MANUAL_LIABILITY_CATEGORIES.map(c => ({ value: c.id, label: `${c.emoji} ${c.label}` }));

  const getAssetCatLabel = (id: string) => {
    const all = [...MANUAL_ASSET_CATEGORIES, ...MANUAL_LIABILITY_CATEGORIES];
    return all.find(c => c.id === id)?.label ?? id;
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
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Assets & Liabilities</h1>
          <p className="text-white/50 text-sm mt-0.5">Manage manual entries that count toward net worth</p>
        </div>
      </div>

      <GlassCard padding="lg">
        <p className="text-white/40 text-sm mb-4">Update periodically to keep your net worth accurate.</p>

        {/* Assets */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-[#00E600]">Assets</h3>
            <Button variant="ghost" size="sm" onClick={() => openAddEntry(false)}>+ Add Asset</Button>
          </div>
          {assets.length > 0 ? (
            <div className="space-y-2">
              {assets.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/8">
                  <div>
                    <p className="text-white text-sm font-medium">{entry.name}</p>
                    <p className="text-white/40 text-xs">{getAssetCatLabel(entry.assetCategory)} · Updated {formatDate(entry.lastUpdated, 'short')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[#00E600] font-mono text-sm font-semibold">{formatCurrency(entry.value, defaultCurrency)}</p>
                    <button onClick={() => openEditEntry(entry)} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={() => setDeleteEntryId(entry.id)} className="p-1.5 rounded-lg text-white/30 hover:text-[#FF5555] hover:bg-[#FF5555]/10 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/30 text-sm">No assets added</p>
          )}
        </div>

        {/* Liabilities */}
        <div className="border-t border-white/5 pt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-[#FF5555]">Liabilities</h3>
            <Button variant="ghost" size="sm" onClick={() => openAddEntry(true)}>+ Add Liability</Button>
          </div>
          {liabilities.length > 0 ? (
            <div className="space-y-2">
              {liabilities.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/8">
                  <div>
                    <p className="text-white text-sm font-medium">{entry.name}</p>
                    <p className="text-white/40 text-xs">{getAssetCatLabel(entry.assetCategory)} · Updated {formatDate(entry.lastUpdated, 'short')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-[#FF5555] font-mono text-sm font-semibold">-{formatCurrency(entry.value, defaultCurrency)}</p>
                    <button onClick={() => openEditEntry(entry)} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </button>
                    <button onClick={() => setDeleteEntryId(entry.id)} className="p-1.5 rounded-lg text-white/30 hover:text-[#FF5555] hover:bg-[#FF5555]/10 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/30 text-sm">No liabilities added</p>
          )}
        </div>
      </GlassCard>

      {/* ENTRY MODAL */}
      <Modal
        isOpen={showEntryModal}
        onClose={() => setShowEntryModal(false)}
        title={editingEntry ? `Edit ${entryIsLiability ? 'Liability' : 'Asset'}` : `Add ${entryIsLiability ? 'Liability' : 'Asset'}`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowEntryModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveEntry} disabled={!entryName || !entryValue}>{editingEntry ? 'Save' : 'Add'}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-white/70 mb-2 block">Name</label>
            <input
              type="text"
              placeholder={entryIsLiability ? 'Student loan, Mortgage...' : 'House, Car, Savings...'}
              value={entryName}
              onChange={e => setEntryName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#00E600]/50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-white/70 mb-2 block">Value ({defaultCurrency})</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="50000"
              value={entryValue}
              onChange={e => setEntryValue(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#00E600]/50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-white/70 mb-2 block">Category</label>
            <select
              value={entryCategory}
              onChange={e => setEntryCategory(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00E600]/50"
            >
              {(entryIsLiability ? liabilityCatOptions : assetCatOptions).map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* DELETE CONFIRM */}
      <Modal
        isOpen={deleteEntryId !== null}
        onClose={() => setDeleteEntryId(null)}
        title="Delete Entry"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteEntryId(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => { deleteManualEntry(deleteEntryId!); setDeleteEntryId(null); }}>Delete</Button>
          </>
        }
      >
        <p className="text-white/70">Are you sure you want to delete this entry? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
