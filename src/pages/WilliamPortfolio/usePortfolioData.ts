/**
 * Data hook for the William Portfolio screen.
 * Reuses calculateCurrentHoldings; derives totals, allocation (top-3 + Other),
 * and sorting. Display-only — no mutations.
 */
import { useMemo } from 'react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useAllocationStore } from '../../stores/allocationStore';
import { calculateCurrentHoldings } from '../../utils/calculations';
import type { CurrentHolding } from '../../types/index';

export type SortKey = 'value' | 'gain' | 'return';
export type SortDir = 'asc' | 'desc';

const ALLOC_COLORS = ['var(--w-accent)', 'var(--w-alloc-lime)', 'var(--w-alloc-blue)', 'var(--w-accent-bg)'];

export function usePortfolioData(sortBy: SortKey, sortDir: SortDir = 'desc') {
  const trades           = usePortfolioStore((s) => s.trades);
  const currentPrices    = usePortfolioStore((s) => s.currentPrices);
  const lastPriceUpdates = usePortfolioStore((s) => s.lastPriceUpdates);
  const defaultCurrency  = useSettingsStore((s) => s.defaultCurrency);
  const exchangeRates    = useSettingsStore((s) => s.exchangeRates);
  const allocationMode   = useAllocationStore((s) => s.mode);
  const allocationTargets = useAllocationStore((s) => s.targets);

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
    const mult = sortDir === 'desc' ? 1 : -1;
    return [...holdings].sort((a, b) => (key(b) - key(a)) * mult);
  }, [holdings, sortBy, sortDir]);

  // Allocation: top 3 holdings by value + "Other" = sum of the rest.
  // When per-holding targets are set, each row carries target % + drift.
  const indiv = allocationMode === 'individual';
  const allocation = useMemo(() => {
    if (totalValue <= 0) return [] as { label: string; value: number; percent: number; color: string; target: number | null; drift: number | null }[];
    const byValue = [...holdings].sort((a, b) => b.currentValue - a.currentValue);
    const top = byValue.slice(0, 3);
    const rest = byValue.slice(3);
    const items: { label: string; value: number; target: number | null }[] = top.map((h) => ({
      label: h.ticker, value: h.currentValue, target: indiv && allocationTargets[h.ticker] != null ? allocationTargets[h.ticker] : null,
    }));
    const otherTotal = rest.reduce((s, h) => s + h.currentValue, 0);
    if (otherTotal > 0) {
      const otherTarget = indiv ? rest.reduce((s, h) => s + (allocationTargets[h.ticker] ?? 0), 0) : 0;
      items.push({ label: 'Other', value: otherTotal, target: indiv ? otherTarget : null });
    }
    return items.map((it, i) => {
      const percent = (it.value / totalValue) * 100;
      return { ...it, percent, color: ALLOC_COLORS[i % ALLOC_COLORS.length], drift: it.target != null ? percent - it.target : null };
    });
  }, [holdings, totalValue, indiv, allocationTargets]);

  const hasTargets = allocationMode !== 'none' && allocation.some((a) => a.target != null);

  // "Updated" relative time from the most recent price refresh
  const lastUpdatedLabel = useMemo(() => {
    const stamps = Object.values(lastPriceUpdates).filter(Boolean) as string[];
    if (stamps.length === 0) return null;
    const latest = stamps.reduce((a, b) => (a > b ? a : b));
    const diffMs = Date.now() - new Date(latest).getTime();
    if (isNaN(diffMs)) return null;
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    return `${Math.floor(hr / 24)}d ago`;
  }, [lastPriceUpdates]);

  const positionsCount = holdings.length;
  const subtitle = `${positionsCount} holding${positionsCount === 1 ? '' : 's'}`
    + (lastUpdatedLabel ? ` · Updated ${lastUpdatedLabel}` : '');

  return {
    holdings: sorted,
    totalValue, totalInvested, totalGain, totalGainPct,
    positionsCount,
    subtitle,
    allocation,
    hasTargets,
    defaultCurrency,
    isEmpty: holdings.length === 0,
  };
}
