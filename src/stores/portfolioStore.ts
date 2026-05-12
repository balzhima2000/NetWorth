import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StockTrade } from '../types/index';

interface PortfolioStore {
  trades: StockTrade[];
  currentPrices: Record<string, number>;
  lastPriceUpdates: Record<string, string>;
  priceSources: Record<string, 'excel' | 'live'>;
  addTrade: (trade: StockTrade) => void;
  updateTrade: (id: string, updates: Partial<StockTrade>) => void;
  deleteTrade: (id: string) => void;
  updateCurrentPrice: (ticker: string, price: number, source?: 'excel' | 'live') => void;
}

export const usePortfolioStore = create<PortfolioStore>()(
  persist(
    (set) => ({
      trades: [],
      currentPrices: {},
      lastPriceUpdates: {},
      priceSources: {},
      addTrade: (trade) => set((state) => ({ trades: [...state.trades, trade] })),
      updateTrade: (id, updates) =>
        set((state) => ({
          trades: state.trades.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      deleteTrade: (id) =>
        set((state) => ({ trades: state.trades.filter((t) => t.id !== id) })),
      updateCurrentPrice: (ticker, price, source = 'live') =>
        set((state) => ({
          currentPrices: { ...state.currentPrices, [ticker]: price },
          lastPriceUpdates: {
            ...state.lastPriceUpdates,
            [ticker]: new Date().toISOString(),
          },
          priceSources: { ...state.priceSources, [ticker]: source },
        })),
    }),
    {
      name: 'nw-portfolio',
      version: 2,
      migrate: (persisted: any, version: number) => {
        if (version < 1) {
          persisted.trades = (persisted.trades ?? []).map((t: any) => ({
            ...t,
            currency: t.currency ?? (t.market === 'tase' ? 'ILS' : 'USD'),
          }));
        }
        if (version < 2) {
          // Backfill priceSources: any existing price has no source recorded,
          // which means it came from a prior Excel import (no live refresh had run yet).
          const prices = persisted.currentPrices ?? {};
          const sources: Record<string, 'excel' | 'live'> = {};
          for (const ticker of Object.keys(prices)) {
            sources[ticker] = 'excel';
          }
          persisted.priceSources = sources;
        }
        return persisted;
      },
    }
  )
);
