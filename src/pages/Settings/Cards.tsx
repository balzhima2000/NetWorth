import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCardsStore } from '../../stores/cardsStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { GlassCard, Button, Modal } from '../../components/ui';
import { CARD_COLORS } from '../../utils/constants';
import type { Card } from '../../types/index';

export default function CardsSettings() {
  const navigate = useNavigate();
  
  useEffect(() => { document.title = 'Cards Settings — NetWorth Tracker'; }, []);

  const cards = useCardsStore((s) => s.cards);
  const addCard = useCardsStore((s) => s.addCard);
  const updateCard = useCardsStore((s) => s.updateCard);
  const deleteCard = useCardsStore((s) => s.deleteCard);
  const incomeDestinations = useCardsStore((s) => s.incomeDestinations);
  const addIncomeDestination = useCardsStore((s) => s.addIncomeDestination);
  const deleteIncomeDestination = useCardsStore((s) => s.deleteIncomeDestination);
  
  const defaultExpensePayment = useSettingsStore((s) => s.defaultExpensePayment);
  const setDefaultExpensePayment = useSettingsStore((s) => s.setDefaultExpensePayment);
  const defaultIncomeDestination = useSettingsStore((s) => s.defaultIncomeDestination);
  const setDefaultIncomeDestination = useSettingsStore((s) => s.setDefaultIncomeDestination);

  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardName, setCardName] = useState('');
  const [cardColor, setCardColor] = useState(CARD_COLORS[0]);
  const [deleteCardId, setDeleteCardId] = useState<string | null>(null);
  
  const [newDestName, setNewDestName] = useState('');
  const [showNewDestInput, setShowNewDestInput] = useState(false);
  const [deleteDestId, setDeleteDestId] = useState<string | null>(null);

  const openAddCard = () => {
    setEditingCard(null);
    setCardName('');
    setCardColor(CARD_COLORS[0]);
    setShowCardModal(true);
  };

  const openEditCard = (card: Card) => {
    setEditingCard(card);
    setCardName(card.name);
    setCardColor(card.color);
    setShowCardModal(true);
  };

  const handleSaveCard = () => {
    if (!cardName) return;
    if (editingCard) {
      updateCard(editingCard.id, { name: cardName, color: cardColor });
    } else {
      addCard({ id: crypto.randomUUID(), name: cardName, color: cardColor, isActive: true });
    }
    setShowCardModal(false);
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
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Cards</h1>
          <p className="text-white/50 text-sm mt-0.5">Manage payment cards and accounts</p>
        </div>
      </div>

      {/* ── PAYMENT CARDS ── */}
      <GlassCard padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">💳 Payment Cards</h2>
          <Button variant="secondary" size="sm" onClick={openAddCard}>+ Add Card</Button>
        </div>
        <div className="space-y-2">
          {/* Cash (built-in) */}
          <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/8 opacity-60">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-[#00E600]" />
              <span className="text-white text-sm font-medium">💵 Cash</span>
              <span className="text-xs text-white/30">built-in</span>
            </div>
          </div>
          {cards.map((card) => (
            <div key={card.id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/8">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full" style={{ background: card.color }} />
                <span className="text-white text-sm font-medium">{card.name}</span>
                {!card.isActive && <span className="text-xs text-white/30 bg-white/10 px-1.5 rounded">inactive</span>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => updateCard(card.id, { isActive: !card.isActive })} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors text-xs px-2" title={card.isActive ? 'Deactivate' : 'Activate'}>
                  {card.isActive ? '⏸' : '▶'}
                </button>
                <button onClick={() => openEditCard(card)} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button onClick={() => setDeleteCardId(card.id)} className="p-1.5 rounded-lg text-white/30 hover:text-[#FF5555] hover:bg-[#FF5555]/10 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          ))}
          {cards.length === 0 && <p className="text-white/30 text-sm">No cards added yet</p>}
        </div>
        {/* Default payment method for expenses */}
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between gap-4">
          <div>
            <p className="text-white/70 text-sm font-medium">Default for expenses</p>
            <p className="text-white/35 text-xs mt-0.5">Pre-selected when adding an expense</p>
          </div>
          <select
            value={defaultExpensePayment}
            onChange={e => setDefaultExpensePayment(e.target.value)}
            className="min-w-[140px] bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00E600]/50"
          >
            <option value="cash">💵 Cash</option>
            {cards.filter(c => c.isActive).map(c => (
              <option key={c.id} value={c.id}>💳 {c.name || 'Unnamed Card'}</option>
            ))}
          </select>
        </div>
      </GlassCard>

      {/* ── INCOME DESTINATIONS ── */}
      <GlassCard padding="lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-white">🏦 Income Destinations</h2>
            <p className="text-white/40 text-xs mt-0.5">Where income lands — shown when adding income transactions</p>
          </div>
          {!showNewDestInput && (
            <Button variant="secondary" size="sm" onClick={() => setShowNewDestInput(true)}>+ Add Account</Button>
          )}
        </div>
        <div className="space-y-2">
          {/* Cash — built-in, non-deletable */}
          <div className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/8 opacity-60">
            <div className="flex items-center gap-3">
              <span className="text-base leading-none">💵</span>
              <span className="text-white text-sm font-medium">Cash</span>
              <span className="text-xs text-white/30">built-in</span>
            </div>
          </div>
          {incomeDestinations.filter(d => d.id !== 'cash').map((dest) => (
            <div key={dest.id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/8">
              <div className="flex items-center gap-3">
                <span className="text-base leading-none">{dest.icon}</span>
                <span className="text-white text-sm font-medium">{dest.name}</span>
              </div>
              <button
                onClick={() => setDeleteDestId(dest.id)}
                className="p-1.5 rounded-lg text-white/30 hover:text-[#FF5555] hover:bg-[#FF5555]/10 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          ))}
          {/* Inline add input */}
          {showNewDestInput && (
            <div className="flex gap-2 items-center pt-1">
              <input
                autoFocus
                type="text"
                placeholder="e.g. Chase Checking, Savings Account"
                value={newDestName}
                onChange={e => setNewDestName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newDestName.trim()) {
                    addIncomeDestination({ id: crypto.randomUUID(), name: newDestName.trim(), icon: '🏦' });
                    setNewDestName('');
                    setShowNewDestInput(false);
                  } else if (e.key === 'Escape') {
                    setShowNewDestInput(false);
                    setNewDestName('');
                  }
                }}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#00E600]/50"
              />
              <button
                disabled={!newDestName.trim()}
                onClick={() => {
                  if (!newDestName.trim()) return;
                  addIncomeDestination({ id: crypto.randomUUID(), name: newDestName.trim(), icon: '🏦' });
                  setNewDestName('');
                  setShowNewDestInput(false);
                }}
                className="px-3 py-2 rounded-xl text-sm font-semibold bg-[#00E600]/20 text-[#00E600] hover:bg-[#00E600]/30 disabled:opacity-40 transition-all"
              >Add</button>
              <button onClick={() => { setShowNewDestInput(false); setNewDestName(''); }} className="px-2 py-2 rounded-xl text-sm text-white/40 hover:text-white/60 transition-all">✕</button>
            </div>
          )}
          {incomeDestinations.filter(d => d.id !== 'cash').length === 0 && !showNewDestInput && (
            <p className="text-white/30 text-sm">No accounts added yet</p>
          )}
        </div>
        {/* Default income destination */}
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between gap-4">
          <div>
            <p className="text-white/70 text-sm font-medium">Default for income</p>
            <p className="text-white/35 text-xs mt-0.5">Pre-selected when adding income</p>
          </div>
          <select
            value={defaultIncomeDestination}
            onChange={e => setDefaultIncomeDestination(e.target.value)}
            className="min-w-[140px] bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00E600]/50"
          >
            {incomeDestinations.map(d => (
              <option key={d.id} value={d.id}>{d.icon} {d.name}</option>
            ))}
          </select>
        </div>
      </GlassCard>

      {/* CARD MODAL */}
      <Modal
        isOpen={showCardModal}
        onClose={() => setShowCardModal(false)}
        title={editingCard ? 'Edit Card' : 'Add Card'}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCardModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveCard} disabled={!cardName}>{editingCard ? 'Save' : 'Add Card'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-white/70 mb-2 block">Card Name</label>
            <input
              type="text"
              placeholder="Visa *1234, Mastercard..."
              value={cardName}
              onChange={e => setCardName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#00E600]/50"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-white/70 mb-2">Card Color</p>
            <div className="flex flex-wrap gap-2">
              {CARD_COLORS.map(c => (
                <button key={c} onClick={() => setCardColor(c)} className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${cardColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111111] scale-110' : ''}`} style={{ background: c }} />
              ))}
            </div>
          </div>
          {cardName && (
            <div className="p-3 rounded-xl text-sm font-medium text-white flex items-center gap-2" style={{ background: `${cardColor}22`, border: `1px solid ${cardColor}44` }}>
              <div className="w-3 h-3 rounded-full" style={{ background: cardColor }} />
              {cardName}
            </div>
          )}
        </div>
      </Modal>

      {/* DELETE CARD CONFIRM */}
      <Modal
        isOpen={deleteCardId !== null}
        onClose={() => setDeleteCardId(null)}
        title="Delete Card"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteCardId(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => { deleteCard(deleteCardId!); setDeleteCardId(null); }}>Delete</Button>
          </>
        }
      >
        <p className="text-white/70">Are you sure you want to delete this card? This action cannot be undone.</p>
      </Modal>

      {/* DELETE DESTINATION CONFIRM */}
      <Modal
        isOpen={deleteDestId !== null}
        onClose={() => setDeleteDestId(null)}
        title="Delete Destination"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteDestId(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => { deleteIncomeDestination(deleteDestId!); setDeleteDestId(null); }}>Delete</Button>
          </>
        }
      >
        <p className="text-white/70">Are you sure you want to delete this destination? This action cannot be undone.</p>
      </Modal>
    </div>
  );
}
