/**
 * Data hook for the William Dashboard.
 * Aggregates all stores into the shape the UI needs.
 */
import { useMemo } from 'react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useNetWorthStore } from '../../stores/networthStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { calculateCurrentHoldings } from '../../utils/calculations';
import { getCurrentMonthYear } from '../../utils/formatters';

export type RangeOption = '30D' | '3M' | '6M' | '1Y' | 'All';

const RANGE_DAYS: Record<RangeOption, number | null> = {
  '30D': 30, '3M': 90, '6M': 180, '1Y': 365, 'All': null,
};

export function useDashboardData(range: RangeOption) {
  const trades          = usePortfolioStore((s) => s.trades);
  const currentPrices   = usePortfolioStore((s) => s.currentPrices);
  const lastPriceUpdates = usePortfolioStore((s) => s.lastPriceUpdates);
  const manualEntries   = useNetWorthStore((s) => s.manualEntries);
  const snapshots       = useNetWorthStore((s) => s.snapshots);
  const getSnapshotsByRange = useNetWorthStore((s) => s.getSnapshotsByRange);
  const transactions    = useTransactionStore((s) => s.transactions);
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);
  const exchangeRates   = useSettingsStore((s) => s.exchangeRates);
  const fireTarget      = useSettingsStore((s) => s.fireTarget);
  const fireAnnualExpenses = useSettingsStore((s) => s.fireAnnualExpenses);
  const fireWithdrawalRate = useSettingsStore((s) => s.fireWithdrawalRate);
  const userName        = useSettingsStore((s) => s.userNickname || s.userName);

  const holdings = useMemo(
    () => calculateCurrentHoldings(trades, currentPrices, lastPriceUpdates, exchangeRates),
    [trades, currentPrices, lastPriceUpdates, exchangeRates],
  );

  const portfolioValue = useMemo(
    () => holdings.reduce((s, h) => s + h.currentValue, 0),
    [holdings],
  );

  const manualAssets      = manualEntries.filter((e) => !e.isLiability);
  const manualLiabilities = manualEntries.filter((e) => e.isLiability);
  const manualAssetsTotal = manualAssets.reduce((s, e) => s + e.value, 0);
  const liabilitiesTotal  = manualLiabilities.reduce((s, e) => s + e.value, 0);
  const totalAssets       = portfolioValue + manualAssetsTotal;
  const netWorth          = totalAssets - liabilitiesTotal;

  // Chart snapshots for selected range
  const chartData = useMemo(() => {
    const snaps = getSnapshotsByRange(RANGE_DAYS[range]);
    return snaps.map((s) => ({ date: s.date, value: s.netWorth }));
  }, [getSnapshotsByRange, range]);

  // Comparison: same-length window before the chart window
  const comparisonData = useMemo(() => {
    const days = RANGE_DAYS[range];
    if (!days || snapshots.length === 0) return [];
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    const prevCutoff = new Date(cutoff); prevCutoff.setDate(prevCutoff.getDate() - days);
    const prev = snapshots.filter(
      (s) => new Date(s.date) >= prevCutoff && new Date(s.date) < cutoff,
    );
    // align timestamps: shift forward by `days` days so lines overlap visually
    return prev.map((s) => {
      const d = new Date(s.date); d.setDate(d.getDate() + days);
      return { date: d.toISOString().split('T')[0], value: s.netWorth };
    });
  }, [snapshots, range]);

  // Net change over the period
  const periodDelta = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].value;
    const last  = chartData[chartData.length - 1].value;
    const abs   = last - first;
    const pct   = first !== 0 ? (abs / Math.abs(first)) * 100 : 0;
    return { abs, pct };
  }, [chartData]);

  // This month P&L
  const { month, year } = getCurrentMonthYear();
  const monthTransactions = useMemo(
    () => transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    }),
    [transactions, month, year],
  );
  const monthIncome  = monthTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.convertedAmount, 0);
  const monthExpense = monthTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.convertedAmount, 0);
  const monthNet     = monthIncome - monthExpense;

  // FIRE progress
  const effectiveFireTarget = useMemo(() => {
    if (fireTarget) return fireTarget;
    if (fireAnnualExpenses && fireWithdrawalRate) {
      return (fireAnnualExpenses / (fireWithdrawalRate / 100));
    }
    return null;
  }, [fireTarget, fireAnnualExpenses, fireWithdrawalRate]);
  const fireProgress = effectiveFireTarget && effectiveFireTarget > 0
    ? Math.min((netWorth / effectiveFireTarget) * 100, 100)
    : null;

  // Recent activity — last 10 transactions
  const recentActivity = useMemo(
    () => [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
    [transactions],
  );

  // Breakdown for the bar: portfolio + manual assets (non-liability)
  const breakdown = useMemo(() => {
    const items: { label: string; value: number }[] = [];
    if (portfolioValue > 0)    items.push({ label: 'Portfolio', value: portfolioValue });
    manualAssets.forEach((e) => items.push({ label: e.name, value: e.value }));
    return items;
  }, [portfolioValue, manualAssets]);

  const isEmpty = snapshots.length === 0 && trades.length === 0 && manualEntries.length === 0;

  return {
    netWorth, totalAssets, liabilitiesTotal,
    portfolioValue, holdings,
    chartData, comparisonData, periodDelta,
    monthNet, monthIncome, monthExpense, monthTransactions,
    fireProgress, effectiveFireTarget,
    recentActivity,
    breakdown,
    defaultCurrency, userName,
    isEmpty,
  };
}
