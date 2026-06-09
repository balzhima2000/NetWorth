/**
 * Data hook for the William Portfolio screen.
 * Reuses calculateCurrentHoldings; derives totals, allocation (top-3 + Other),
 * and sorting. Display-only — no mutations.
 */
import { useMemo } from 'react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { calculateCurrentHoldings } from '../../utils/calculations';
import type { CurrentHolding } from '../../types/index';

export type SortKey = 'value' | 'gain' | 'return';

const ALLOC_COLORS = ['var(--w-accent)', 'var(--w-alloc-lime)', 'var(--w-alloc-blue)', 'var(--w-accent-bg)'];

export function usePortfolioData(sortBy: SortKey) {
  const trades           = usePortfolioStore((s) => s.trades);
  const currentPrices    = usePortfolioStore((s) => s.currentPrices);
  const lastPriceUpdates = usePortfolioStore((s) => s.lastPriceUpdates);
  const defaultCurrency  = useSettingsStore((s) => s.defaultCurrency);
  const exchangeRates    = useSettingsStore((s) => s.exchangeRates);

  const holdings = useMemo(
    () => calculateCurrentHoldings(trades, currentPrices, lastPriceUpdates, exchangeRates),
    [trades, currentPrices, lastPriceUpdates, exchangeRates],
  );

  const totalValue    = holdings.reduce((s, h) => s + h.currentValue, 0);
  const totalInvested = holdings.reduce((s, h) => s + h.costBasisTotal, 0);
  const totalGain     = totalValue - totalInvested;
  const totalGainPct  = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  const sorted = useMemo(() => {
    const key = (h: CurrentHolding) =>
      sortBy === 'value' ? h.currentValue : sortBy === 'gain' ? h.unrealizedGain : h.unrealizedGainPercent;
    return [...holdings].sort((a, b) => key(b) - key(a));
  }, [holdings, sortBy]);

  // Allocation: top 3 holdings by value + "Other" = sum of the rest
  const allocation = useMemo(() => {
    if (totalValue <= 0) return [] as { label: string; value: number; percent: number; color: string }[];
    const byValue = [...holdings].sort((a, b) => b.currentValue - a.currentValue);
    const top = byValue.slice(0, 3);
    const rest = byValue.slice(3);
    const items = top.map((h) => ({ label: h.ticker, value: h.currentValue }));
    const otherTotal = rest.reduce((s, h) => s + h.currentValue, 0);
    if (otherTotal > 0) items.push({ label: 'Other', value: otherTotal });
    return items.map((it, i) => ({
      ...it,
      percent: (it.value / totalValue) * 100,
      color: ALLOC_COLORS[i % ALLOC_COLORS.length],
    }));
  }, [holdings, totalValue]);

  return {
    holdings: sorted,
    totalValue, totalInvested, totalGain, totalGainPct,
    positionsCount: holdings.length,
    allocation,
    defaultCurrency,
    isEmpty: holdings.length === 0,
  };
}
