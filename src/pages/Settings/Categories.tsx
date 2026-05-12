import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategoriesStore } from '../../stores/categoriesStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { GlassCard, Button, Modal } from '../../components/ui';
import type { SpendingCategory } from '../../types/index';

const EMOJI_OPTIONS = [
  '🍕','🍔','🌮','🍣','🥗','☕','🍺','🥤','🍰','🥡',
  '🛒','👕','👟','👜','💄','🎁','🏷️','🧴',
  '🏠','🛋️','⚡','💧','📦','🔧','🌿','🏡',
  '🚗','🚌','🚂','✈️','🚲','⛽','🛵','🚕',
  '💊','🏥','🏋️','🧘','🦷','🩺','💉','🌡️',
  '🎮','🎬','🎵','🎭','📚','🎲','🏖️','🎨',
  '💰','💳','📈','🏦','💸','🪙','💼','📊',
  '👶','🐶','🎓','🎉','❤️','🙏','🤝','⭐',
];

export default function CategoriesSettings() {
  const navigate = useNavigate();
  
  useEffect(() => { document.title = 'Categories Settings — NetWorth Tracker'; }, []);

  const categories = useCategoriesStore((s) => s.categories);
  const addCategory = useCategoriesStore((s) => s.addCategory);
  const updateCategory = useCategoriesStore((s) => s.updateCategory);
  const deleteCategory = useCategoriesStore((s) => s.deleteCategory);
  const incomeCategories = useCategoriesStore((s) => s.incomeCategories);
  const addIncomeCategory = useCategoriesStore((s) => s.addIncomeCategory);
  const updateIncomeCategory = useCategoriesStore((s) => s.updateIncomeCategory);
  const deleteIncomeCategory = useCategoriesStore((s) => s.deleteIncomeCategory);

  const transactions = useTransactionStore((s) => s.transactions);

  const [editingCat, setEditingCat] = useState<SpendingCategory | null>(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catEmoji, setCatEmoji] = useState('');
  const [catColor, setCatColor] = useState('#6b7280');
  const [catContext, setCatContext] = useState<'expense' | 'income'>('expense');
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null);
  const [deleteCatContext, setDeleteCatContext] = useState<'expense' | 'income'>('expense');

  const openAddCat = (context: 'expense' | 'income') => {
    setEditingCat(null);
    setCatName('');
    setCatEmoji('');
    setCatColor('#6b7280');
    setCatContext(context);
    setShowCatModal(true);
  };

  const openEditCat = (cat: SpendingCategory, context: 'expense' | 'income') => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatEmoji(cat.emoji);
    setCatColor(cat.color);
    setCatContext(context);
    setShowCatModal(true);
  };

  const handleSaveCat = () => {
    if (!catName) return;
    if (editingCat) {
      if (catContext === 'expense') {
        updateCategory(editingCat.id, { name: catName, emoji: catEmoji, color: catColor });
      } else {
        updateIncomeCategory(editingCat.id, { name: catName, emoji: catEmoji, color: catColor });
      }
    } else {
      if (catContext === 'expense') {
        addCategory({ id: crypto.randomUUID(), name: catName, emoji: catEmoji || '💰', color: catColor, isDefault: false });
      } else {
        addIncomeCategory({ id: `income_${crypto.randomUUID()}`, name: catName, emoji: catEmoji || '💰', color: catColor, isDefault: false });
      }
    }
    setShowCatModal(false);
  };

  const confirmDeleteCat = (catId: string, context: 'expense' | 'income') => {
    setDeleteCatId(catId);
    setDeleteCatContext(context);
  };

  const handleDeleteCat = () => {
    if (!deleteCatId) return;
    if (deleteCatContext === 'expense') {
      deleteCategory(deleteCatId);
    } else {
      deleteIncomeCategory(deleteCatId);
    }
    setDeleteCatId(null);
  };

  const catHasTransactions = (catId: string) => transactions.some(t => t.category === catId);

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
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Categories</h1>
          <p className="text-white/50 text-sm mt-0.5">Manage transaction categories</p>
        </div>
      </div>

      {/* ── EXPENSE CATEGORIES ── */}
      <GlassCard padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">🏷️ Expense Categories</h2>
          <Button variant="secondary" size="sm" onClick={() => openAddCat('expense')}>+ Add</Button>
        </div>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/8">
              <div className="flex items-center gap-2">
                <span className="text-lg">{cat.emoji}</span>
                <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                <span className="text-white text-sm font-medium">{cat.name}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEditCat(cat, 'expense')} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button
                  onClick={() => !catHasTransactions(cat.id) && confirmDeleteCat(cat.id, 'expense')}
                  disabled={catHasTransactions(cat.id)}
                  className={`p-1.5 rounded-lg transition-colors ${catHasTransactions(cat.id) ? 'text-white/15 cursor-not-allowed' : 'text-white/30 hover:text-[#FF5555] hover:bg-[#FF5555]/10'}`}
                  title={catHasTransactions(cat.id) ? 'Category is used in transactions' : 'Delete'}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
          {categories.length === 0 && <p className="text-white/30 text-sm">No expense categories</p>}
        </div>
      </GlassCard>

      {/* ── INCOME CATEGORIES ── */}
      <GlassCard padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">💰 Income Categories</h2>
          <Button variant="secondary" size="sm" onClick={() => openAddCat('income')}>+ Add</Button>
        </div>
        <div className="space-y-2">
          {incomeCategories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/8">
              <div className="flex items-center gap-2">
                <span className="text-lg">{cat.emoji}</span>
                <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                <span className="text-white text-sm font-medium">{cat.name}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEditCat(cat, 'income')} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button
                  onClick={() => !catHasTransactions(cat.id) && confirmDeleteCat(cat.id, 'income')}
                  disabled={catHasTransactions(cat.id)}
                  className={`p-1.5 rounded-lg transition-colors ${catHasTransactions(cat.id) ? 'text-white/15 cursor-not-allowed' : 'text-white/30 hover:text-[#FF5555] hover:bg-[#FF5555]/10'}`}
                  title={catHasTransactions(cat.id) ? 'Category is used in transactions' : 'Delete'}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
          {incomeCategories.length === 0 && <p className="text-white/30 text-sm">No income categories</p>}
        </div>
      </GlassCard>

      {/* CATEGORY MODAL */}
      <Modal
        isOpen={showCatModal}
        onClose={() => setShowCatModal(false)}
        title={editingCat ? `Edit ${catContext === 'expense' ? 'Expense' : 'Income'} Category` : `Add ${catContext === 'expense' ? 'Expense' : 'Income'} Category`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCatModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveCat} disabled={!catName}>{editingCat ? 'Save' : 'Add'}</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-white/70 mb-2 block">Name</label>
            <input
              type="text"
              placeholder="Category name"
              value={catName}
              onChange={e => setCatName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#00E600]/50"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-white/70 mb-2">Emoji</p>
            <div className="grid grid-cols-8 gap-1 p-2 bg-white/5 rounded-xl max-h-36 overflow-y-auto mb-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setCatEmoji(emoji)}
                  className={`text-xl p-1.5 rounded-lg transition-all hover:bg-white/10 ${catEmoji === emoji ? 'bg-[#00E600]/30 ring-1 ring-[#00E600]' : ''}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Or type a custom emoji..."
              value={catEmoji}
              onChange={e => setCatEmoji(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#00E600]/50"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-white/70 mb-2">Color</p>
            <div className="flex flex-wrap gap-2">
              {['#00E600','#00E600','#FF5555','#f59e0b','#06b6d4','#ec4899','#8b5cf6','#10b981','#f97316','#6b7280','#FF5555','#3b82f6'].map(c => (
                <button key={c} onClick={() => setCatColor(c)} className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${catColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111111] scale-110' : ''}`} style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* DELETE CONFIRM */}
      <Modal
        isOpen={deleteCatId !== null}
        onClose={() => setDeleteCatId(null)}
        title="Delete Category"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteCatId(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteCat}>Delete</Button>
          </>
        }
      >
        <p className="text-white/70">Are you sure you want to delete this category? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
