import { useEffect, useState, useMemo, useRef } from 'react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useNetWorthStore } from '../../stores/networthStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useRecurringStore } from '../../stores/recurringStore';
import { useBudgetStore } from '../../stores/budgetStore';
import { GlassCard, Button, EmptyState } from '../../components/ui';
import { formatCurrency, formatDate, getCurrentMonthYear } from '../../utils/formatters';
import { calculateCurrentHoldings } from '../../utils/calculations';
import { NetWorthLineChart } from '../../components/charts/NetWorthLineChart';
import { TREND_PERIODS } from '../../utils/constants';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useIsMobile';

type TrendPeriod = typeof TREND_PERIODS[number];

// ── Presentational building blocks ───────────────────────────────────────────

function MetricCell({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string;
  color?: string;
  sub?: string;
}) {
  return (
    <div>
      <p className="text-white/35 text-[10px] font-medium uppercase tracking-wider leading-none">
        {label}
      </p>
      <p
        className="font-mono font-semibold text-sm mt-1 leading-none tabular-nums"
        style={{ color: color ?? 'rgba(255,255,255,0.85)' }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[10px] text-white/25 mt-0.5 leading-none">{sub}</p>
      )}
    </div>
  );
}

interface InsightItem {
  id: string;
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
  href: string;
}

function InsightChip({
  item,
  onClick,
}: {
  item: InsightItem;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl flex-shrink-0 transition-all hover:bg-white/[0.08] active:scale-[0.97] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/40"
      style={{
        background: 'rgba(255,255,255,0.045)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <span className="text-sm leading-none flex-shrink-0">{item.icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-white/38 uppercase tracking-wider leading-none whitespace-nowrap">
          {item.label}
        </p>
        <p
          className="text-xs font-semibold mt-1 font-mono leading-none whitespace-nowrap"
          style={{ color: item.valueColor ?? 'rgba(255,255,255,0.82)' }}
        >
          {item.value}
        </p>
      </div>
    </button>
  );
}

interface WealthSegment {
  label: string;
  value: number;
  color: string;
}

function WealthCompositionBar({
  segments,
  total,
  liabilities,
  currency,
}: {
  segments: WealthSegment[];
  total: number;
  liabilities: number;
  currency: string;
}) {
  if (total <= 0) return null;
  const active = segments.filter((s) => s.value > 1);
  if (active.length < 2 && liabilities === 0) return null;

  return (
    <div>
      {/* Segmented bar */}
      <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
        {active.map((s) => (
          <div
            key={s.label}
            className="h-full transition-all duration-700"
            style={{
              width: `${(s.value / total) * 100}%`,
              background: s.color,
              borderRadius: 4,
            }}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2.5">
        {active.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: s.color }}
            />
            <p className="text-[11px] text-white/45">{s.label}</p>
            <p className="text-[11px] font-mono text-white/65">
              {((s.value / total) * 100).toFixed(0)}%
            </p>
          </div>
        ))}
        {liabilities > 0 && (
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-red-500/50" />
            <p className="text-[11px] text-white/45">Debt</p>
            <p className="text-[11px] font-mono" style={{ color: 'rgba(239,68,68,0.7)' }}>
              {formatCurrency(liabilities, currency, true)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // ── Store subscriptions ────────────────────────────────────────
  const trades = usePortfolioStore((s) => s.trades);
  const currentPrices = usePortfolioStore((s) => s.currentPrices);
  const lastPriceUpdates = usePortfolioStore((s) => s.lastPriceUpdates);

  const manualEntries = useNetWorthStore((s) => s.manualEntries);
  const addSnapshot = useNetWorthStore((s) => s.addSnapshot);
  const lastSnapshotDate = useNetWorthStore((s) => s.lastSnapshotDate);
  const snapshots = useNetWorthStore((s) => s.snapshots);
  const getSnapshotsByRange = useNetWorthStore((s) => s.getSnapshotsByRange);

  const transactions = useTransactionStore((s) => s.transactions);
  const recurringPayments = useRecurringStore((s) => s.recurringPayments);
  const getBudgetsByMonth = useBudgetStore((s) => s.getBudgetsByMonth);

  const fireTarget = useSettingsStore((s) => s.fireTarget);
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);
  const exchangeRates = useSettingsStore((s) => s.exchangeRates);
  const userNickname = useSettingsStore((s) => s.userNickname);
  const activityFeedShowTransactions = useSettingsStore((s) => s.activityFeedShowTransactions);
  const activityFeedShowRecurring = useSettingsStore((s) => s.activityFeedShowRecurring);
  const setActivityFeedSettings = useSettingsStore((s) => s.setActivityFeedSettings);

  const [selectedPeriod, setSelectedPeriod] = useState<TrendPeriod>(TREND_PERIODS[1]);

  // ── Core financial calculations ────────────────────────────────
  const holdings = useMemo(
    () => calculateCurrentHoldings(trades, currentPrices, lastPriceUpdates, exchangeRates),
    [trades, currentPrices, lastPriceUpdates, exchangeRates]
  );

  const portfolioValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const assetsManual = manualEntries.filter((e) => !e.isLiability);
  const assetsTotal_manual = assetsManual.reduce((sum, e) => sum + e.value, 0);
  const liabilitiesTotal = manualEntries
    .filter((e) => e.isLiability)
    .reduce((sum, e) => sum + e.value, 0);
  const totalAssets = portfolioValue + assetsTotal_manual;
  const netWorth = totalAssets - liabilitiesTotal;

  // Exchange rate helper
  const getRate = (currency: string) => {
    if (!currency || currency === defaultCurrency) return 1;
    const r = exchangeRates.find((x) => x.currency === currency);
    return r ? r.rateToDefault : 1;
  };

  // ── Time-based calculations ────────────────────────────────────
  const { month, year } = getCurrentMonthYear();

  const monthExpenses = useMemo(
    () =>
      transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year && t.type === 'expense';
      }),
    [transactions, month, year]
  );
  const monthSpending = monthExpenses.reduce((sum, t) => sum + t.convertedAmount, 0);

  const monthIncomeTransactions = useMemo(
    () =>
      transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() + 1 === month && d.getFullYear() === year && t.type === 'income';
      }),
    [transactions, month, year]
  );
  const monthIncome = monthIncomeTransactions.reduce((sum, t) => sum + t.convertedAmount, 0);
  const monthCashFlow = monthIncome - monthSpending;

  // Previous month spending
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonthSpending = useMemo(
    () =>
      transactions
        .filter((t) => {
          const d = new Date(t.date);
          return (
            d.getMonth() + 1 === prevMonth &&
            d.getFullYear() === prevYear &&
            t.type === 'expense'
          );
        })
        .reduce((sum, t) => sum + t.convertedAmount, 0),
    [transactions, prevMonth, prevYear]
  );
  const spendingVsLastMonth =
    prevMonthSpending > 0
      ? ((monthSpending - prevMonthSpending) / prevMonthSpending) * 100
      : null;

  // ── Chart data + period delta ──────────────────────────────────
  const chartData = useMemo(
    () => getSnapshotsByRange(selectedPeriod.days),
    [snapshots, selectedPeriod]
  );

  const netWorthChange = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].netWorth;
    const last = chartData[chartData.length - 1].netWorth;
    return {
      amount: last - first,
      percent: first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0,
    };
  }, [chartData]);

  // ── FIRE ────────────────────────────────────────────────────────
  const fireProgress = fireTarget ? Math.min((netWorth / fireTarget) * 100, 100) : null;
  const fireRemaining = fireTarget ? Math.max(fireTarget - netWorth, 0) : null;

  // ── Upcoming recurring (7 days) ────────────────────────────────
  const dueSoon = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7 = new Date(today);
    in7.setDate(today.getDate() + 7);
    return recurringPayments.filter((p) => {
      if (!p.isActive) return false;
      const due = new Date(p.nextDueDate);
      return due >= today && due <= in7;
    });
  }, [recurringPayments]);

  const dueSoonTotal = dueSoon.reduce(
    (sum, p) => sum + p.amount * getRate(p.currency ?? defaultCurrency),
    0
  );

  // ── Budget attention ───────────────────────────────────────────
  const budgetsOverLimit = useMemo(() => {
    const budgets = getBudgetsByMonth(month, year);
    return budgets.filter((b) => {
      const spent = monthExpenses
        .filter((t) => t.category === b.category)
        .reduce((sum, t) => sum + t.convertedAmount, 0);
      return spent > b.amount;
    });
  }, [monthExpenses, month, year, getBudgetsByMonth]);

  // ── Insights strip ─────────────────────────────────────────────
  const insightItems = useMemo<InsightItem[]>(() => {
    const items: InsightItem[] = [];

    if (budgetsOverLimit.length > 0) {
      items.push({
        id: 'budgets',
        icon: '🔔',
        label: budgetsOverLimit.length === 1 ? '1 budget over' : `${budgetsOverLimit.length} budgets over`,
        value: 'Needs attention',
        valueColor: '#EF4444',
        href: '/spending',
      });
    }

    if (dueSoon.length > 0) {
      items.push({
        id: 'due',
        icon: '📅',
        label: 'Due in 7 days',
        value: formatCurrency(dueSoonTotal, defaultCurrency, true),
        valueColor: '#F59E0B',
        href: '/spending',
      });
    }

    if (spendingVsLastMonth !== null && Math.abs(spendingVsLastMonth) >= 5) {
      const up = spendingVsLastMonth > 0;
      items.push({
        id: 'spending-trend',
        icon: up ? '📈' : '📉',
        label: 'vs last month',
        value: `${up ? '+' : ''}${spendingVsLastMonth.toFixed(0)}% spending`,
        valueColor: up ? '#EF4444' : '#22C55E',
        href: '/spending',
      });
    }

    if (fireProgress !== null) {
      items.push({
        id: 'fire',
        icon: '🔥',
        label: 'FIRE progress',
        value: `${fireProgress.toFixed(1)}%`,
        valueColor: '#10B981',
        href: '/fire',
      });
    }

    if (portfolioValue > 0 && totalAssets > 0) {
      const pct = ((portfolioValue / totalAssets) * 100).toFixed(0);
      items.push({
        id: 'portfolio-weight',
        icon: '💼',
        label: 'Portfolio weight',
        value: `${pct}% of assets`,
        valueColor: '#3B82F6',
        href: '/portfolio',
      });
    }

    return items;
  }, [
    budgetsOverLimit,
    dueSoon,
    dueSoonTotal,
    spendingVsLastMonth,
    fireProgress,
    portfolioValue,
    totalAssets,
    defaultCurrency,
  ]);

  // ── Wealth composition ────────────────────────────────────────
  const wealthSegments = useMemo<WealthSegment[]>(() => {
    const cash = assetsManual
      .filter((e) => e.assetCategory === 'cash_savings')
      .reduce((s, e) => s + e.value, 0);
    const realEstate = assetsManual
      .filter((e) => e.assetCategory === 'real_estate')
      .reduce((s, e) => s + e.value, 0);
    const crypto = assetsManual
      .filter((e) => e.assetCategory === 'crypto')
      .reduce((s, e) => s + e.value, 0);
    const vehicle = assetsManual
      .filter((e) => e.assetCategory === 'vehicle')
      .reduce((s, e) => s + e.value, 0);
    const other = assetsManual
      .filter((e) => !['cash_savings', 'real_estate', 'crypto', 'vehicle'].includes(e.assetCategory))
      .reduce((s, e) => s + e.value, 0);

    return [
      { label: 'Portfolio', value: portfolioValue, color: '#3B82F6' },
      { label: 'Cash', value: cash, color: '#10B981' },
      { label: 'Real Estate', value: realEstate, color: '#8B5CF6' },
      { label: 'Crypto', value: crypto, color: '#F59E0B' },
      { label: 'Vehicle', value: vehicle, color: '#06B6D4' },
      { label: 'Other', value: other, color: '#6B7280' },
    ];
  }, [assetsManual, portfolioValue]);

  // ── Improved activity feed ─────────────────────────────────────
  const dueSoonActivity = useMemo(
    () =>
      activityFeedShowRecurring
        ? dueSoon
            .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))
            .slice(0, 4)
        : [],
    [dueSoon, activityFeedShowRecurring]
  );

  const recentTransactions = useMemo(
    () =>
      activityFeedShowTransactions
        ? [...transactions]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 8)
        : [],
    [transactions, activityFeedShowTransactions]
  );

  // ── Greeting ──────────────────────────────────────────────────
  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 5
      ? 'Good Night'
      : greetingHour < 12
      ? 'Good Morning'
      : greetingHour < 18
      ? 'Good Afternoon'
      : 'Good Evening';
  const greetingEmoji =
    greetingHour < 5
      ? '🌙'
      : greetingHour < 12
      ? '☀️'
      : greetingHour < 18
      ? '🌤️'
      : '🌆';

  // ── Page title + daily snapshot ────────────────────────────────
  useEffect(() => {
    document.title = 'Dashboard — NetWorth Tracker';
  }, []);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (lastSnapshotDate !== today) {
      addSnapshot({
        id: crypto.randomUUID(),
        date: today,
        totalAssets,
        totalLiabilities: liabilitiesTotal,
        netWorth,
        portfolioValue,
        manualAssetsTotal: assetsTotal_manual,
      });
    }
  }, [trades, manualEntries, currentPrices]);

  // ── Count-up animation (mobile hero number) ───────────────────
  const [displayNetWorth, setDisplayNetWorth] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!isMobile) return;
    if (hasAnimated.current) {
      setDisplayNetWorth(netWorth);
      return;
    }
    hasAnimated.current = true;
    const target = netWorth;
    const duration = 900;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayNetWorth(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [netWorth, isMobile]);

  // ── Shared sub-renders ─────────────────────────────────────────

  const periodSelector = (
    <div className="flex gap-1">
      {TREND_PERIODS.map((p) => (
        <button
          key={p.label}
          onClick={() => setSelectedPeriod(p)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/50 ${
            selectedPeriod.label === p.label
              ? 'bg-[#10B981] text-white'
              : 'text-white/40 hover:text-white/70 hover:bg-white/10'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );

  const insightsStrip = insightItems.length > 0 ? (
    <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide -mx-0.5 px-0.5">
      {insightItems.map((item) => (
        <InsightChip
          key={item.id}
          item={item}
          onClick={() => navigate(item.href)}
        />
      ))}
    </div>
  ) : null;

  const isPositive = netWorthChange ? netWorthChange.amount >= 0 : true;
  const changeColor = isPositive ? '#22C55E' : '#EF4444';

  // ──────────────────────────────────────────────────────────────
  // MOBILE LAYOUT
  // ──────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="space-y-3 stagger-children">

        {/* Greeting */}
        <div className="pt-1">
          <p className="text-white/40 text-xs font-medium uppercase tracking-widest mb-0.5">
            {greeting} {greetingEmoji}
          </p>
          <h2 className="text-lg font-semibold text-white leading-tight">
            {userNickname ? userNickname : 'Your Dashboard'}
          </h2>
        </div>

        {/* Hero card */}
        <GlassCard padding="lg">
          {/* Label + badge */}
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-white/45 text-xs font-medium uppercase tracking-widest">Net Worth</p>
            {netWorthChange && (
              <span
                className="text-xs font-semibold font-mono px-2.5 py-1 rounded-full"
                style={{
                  background: `${changeColor}18`,
                  color: changeColor,
                  border: `1px solid ${changeColor}28`,
                }}
              >
                {isPositive ? '+' : ''}{netWorthChange.percent.toFixed(2)}%
              </span>
            )}
          </div>

          {/* Animated net worth number */}
          <h1
            className="text-4xl font-bold text-white font-mono leading-none"
            style={{ letterSpacing: '-0.5px' }}
          >
            {formatCurrency(displayNetWorth, defaultCurrency, true)}
          </h1>

          {netWorthChange && (
            <p className="text-sm font-mono mt-1.5" style={{ color: changeColor }}>
              {isPositive ? '+' : ''}{formatCurrency(netWorthChange.amount, defaultCurrency, true)}
              <span className="text-white/25 ml-1.5 text-xs">vs {selectedPeriod.label}</span>
            </p>
          )}

          {/* Period selector */}
          <div className="mt-3">{periodSelector}</div>

          {/* Chart */}
          {chartData.length > 1 && (
            <div className="mt-3">
              <NetWorthLineChart data={chartData} currency={defaultCurrency} />
            </div>
          )}

          {/* Stats strip */}
          <div
            className="grid mt-4 pt-4 gap-3"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.07)',
              gridTemplateColumns: `repeat(${2 + (liabilitiesTotal > 0 ? 1 : 0) + (monthCashFlow !== 0 && monthIncome > 0 ? 1 : 0)}, 1fr)`,
            }}
          >
            <MetricCell
              label="Assets"
              value={formatCurrency(totalAssets, defaultCurrency, true)}
              color="#22C55E"
            />
            {liabilitiesTotal > 0 && (
              <MetricCell
                label="Debt"
                value={formatCurrency(liabilitiesTotal, defaultCurrency, true)}
                color="#EF4444"
              />
            )}
            <MetricCell
              label="Spent"
              value={formatCurrency(monthSpending, defaultCurrency, true)}
            />
            {monthIncome > 0 && (
              <MetricCell
                label="Cash Flow"
                value={`${monthCashFlow >= 0 ? '+' : ''}${formatCurrency(monthCashFlow, defaultCurrency, true)}`}
                color={monthCashFlow >= 0 ? '#22C55E' : '#EF4444'}
              />
            )}
          </div>
        </GlassCard>

        {/* Insights strip */}
        {insightsStrip && (
          <div>{insightsStrip}</div>
        )}

        {/* FIRE progress */}
        {fireProgress !== null && fireTarget !== null && (
          <GlassCard padding="md">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-white/70 text-sm font-semibold">🔥 FIRE Progress</p>
                <p className="text-white/30 text-xs mt-0.5">
                  Target: {formatCurrency(fireTarget, defaultCurrency, true)}
                </p>
              </div>
              <div className="text-right">
                <p
                  className="text-lg font-bold font-mono leading-none"
                  style={{ color: fireProgress >= 100 ? '#22C55E' : '#10B981' }}
                >
                  {fireProgress.toFixed(1)}%
                </p>
                {fireRemaining !== null && fireRemaining > 0 && (
                  <p className="text-xs text-white/30 mt-0.5">
                    {formatCurrency(fireRemaining, defaultCurrency, true)} left
                  </p>
                )}
              </div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${fireProgress}%`,
                  background: fireProgress >= 100
                    ? 'linear-gradient(90deg,#10B981,#22C55E)'
                    : 'linear-gradient(90deg,#10B981,#34D399)',
                  transition: 'width 800ms cubic-bezier(0.34,1.56,0.64,1)',
                }}
              />
            </div>
            {fireProgress >= 100 && (
              <p className="text-xs text-[#22C55E] mt-2">🎉 You've reached your FIRE target!</p>
            )}
          </GlassCard>
        )}

        {/* Wealth composition */}
        {totalAssets > 0 && (
          <GlassCard padding="md">
            <p className="text-white/45 text-xs font-medium uppercase tracking-wider mb-3">
              Wealth Composition
            </p>
            <WealthCompositionBar
              segments={wealthSegments}
              total={totalAssets}
              liabilities={liabilitiesTotal}
              currency={defaultCurrency}
            />
          </GlassCard>
        )}

        {/* Spending summary */}
        {(monthSpending > 0 || monthIncome > 0) && (
          <GlassCard padding="md">
            <div className="flex items-start justify-between mb-3">
              <p className="text-white/45 text-xs font-medium uppercase tracking-wider">This Month</p>
              {spendingVsLastMonth !== null && (
                <span
                  className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full"
                  style={{
                    background: spendingVsLastMonth > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                    color: spendingVsLastMonth > 0 ? '#EF4444' : '#22C55E',
                  }}
                >
                  {spendingVsLastMonth > 0 ? '+' : ''}{spendingVsLastMonth.toFixed(0)}% vs last month
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MetricCell
                label="Spent"
                value={formatCurrency(monthSpending, defaultCurrency, true)}
                sub={`${monthExpenses.length} transactions`}
              />
              {monthIncome > 0 && (
                <MetricCell
                  label="Income"
                  value={formatCurrency(monthIncome, defaultCurrency, true)}
                  color="#22C55E"
                />
              )}
            </div>
          </GlassCard>
        )}

        {/* Top holdings (compact) */}
        {holdings.length > 0 && (
          <GlassCard padding="md">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/45 text-xs font-medium uppercase tracking-wider">
                Top Holdings
              </p>
              <button
                onClick={() => navigate('/portfolio')}
                className="text-[#10B981] text-xs hover:text-[#10B981]/70 transition-colors"
              >
                View all →
              </button>
            </div>
            <div className="space-y-1.5">
              {holdings.slice(0, 3).map((h) => (
                <div
                  key={h.ticker}
                  className="flex items-center justify-between px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#10B981]/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#10B981] text-[9px] font-bold leading-none">
                        {h.ticker.slice(0, 3)}
                      </span>
                    </div>
                    <p className="text-white font-medium text-sm truncate">{h.ticker}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-white font-mono text-sm">
                      {formatCurrency(h.currentValue, defaultCurrency, true)}
                    </p>
                    <p
                      className="text-[11px] font-mono"
                      style={{ color: h.unrealizedGain >= 0 ? '#22C55E' : '#EF4444' }}
                    >
                      {h.unrealizedGain >= 0 ? '+' : ''}{h.unrealizedGainPercent.toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Activity feed */}
        <GlassCard padding="md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
          </div>

          {dueSoonActivity.length === 0 && recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">📭</p>
              <p className="text-white/30 text-sm">No recent activity</p>
              <p className="text-white/20 text-xs mt-0.5">Tap + to add your first entry</p>
            </div>
          ) : (
            <div className="space-y-1">
              {dueSoonActivity.length > 0 && (
                <>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider px-1 mb-2">
                    Due soon
                  </p>
                  {dueSoonActivity.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                      style={{ background: 'rgba(245,158,11,0.07)' }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-7 h-7 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                          style={{ background: 'rgba(245,158,11,0.12)' }}
                        >
                          🔄
                        </span>
                        <div>
                          <p className="text-white text-sm font-medium leading-tight">{p.name}</p>
                          <p className="text-white/30 text-[11px] mt-0.5">{formatDate(p.nextDueDate, 'short')}</p>
                        </div>
                      </div>
                      <p className="font-mono text-sm font-semibold ml-3" style={{ color: '#F59E0B' }}>
                        {formatCurrency(p.amount, p.currency ?? defaultCurrency)}
                      </p>
                    </div>
                  ))}
                </>
              )}

              {recentTransactions.length > 0 && (
                <>
                  {dueSoonActivity.length > 0 && (
                    <div className="pt-2 pb-1">
                      <p className="text-[10px] text-white/30 uppercase tracking-wider px-1">Recent</p>
                    </div>
                  )}
                  {recentTransactions.slice(0, 6).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-7 h-7 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                          style={{ background: 'rgba(255,255,255,0.06)' }}
                        >
                          💳
                        </span>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate leading-tight">{tx.category}</p>
                          <p className="text-white/30 text-[11px] mt-0.5">{formatDate(tx.date, 'short')}</p>
                        </div>
                      </div>
                      <p
                        className="font-mono text-sm font-semibold ml-3 flex-shrink-0"
                        style={{ color: tx.type === 'expense' ? '#EF4444' : '#22C55E' }}
                      >
                        {tx.type === 'expense' ? '-' : '+'}
                        {formatCurrency(tx.convertedAmount, defaultCurrency)}
                      </p>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </GlassCard>

        {/* Welcome empty state */}
        {holdings.length === 0 && totalAssets === 0 && transactions.length === 0 && (
          <GlassCard padding="lg" className="text-center py-8">
            <p className="text-4xl mb-3">💰</p>
            <h3 className="text-white font-semibold mb-2">Welcome to NetWorth Tracker</h3>
            <p className="text-white/40 text-sm mb-4">
              Start by adding your portfolio holdings, assets, or transactions.
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="primary" onClick={() => navigate('/portfolio')}>Add Holdings</Button>
              <Button variant="secondary" onClick={() => navigate('/spending')}>Add Transaction</Button>
            </div>
          </GlassCard>
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────
  // DESKTOP LAYOUT
  // ──────────────────────────────────────────────────────────────

  const hasAnyData =
    holdings.length > 0 || totalAssets > 0 || transactions.length > 0;

  return (
    <div className="space-y-5">

      {/* Greeting */}
      <div>
        <p className="text-white/40 text-[11px] font-semibold uppercase tracking-widest">
          {greeting} {greetingEmoji}
        </p>
        <h2 className="text-2xl font-bold text-white mt-0.5">
          {userNickname ? `Hello, ${userNickname}` : 'Dashboard'}
        </h2>
      </div>

      {/* ── Hero — net worth command centre ── */}
      <GlassCard padding="lg">
        <div className="space-y-4">

          {/* Header row: label + period selector */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-white/40 text-xs font-medium uppercase tracking-wider">Net Worth</p>
            {periodSelector}
          </div>

          {/* Primary number + delta */}
          <div>
            <h1
              className="text-4xl md:text-5xl font-bold text-white font-mono"
              style={{ letterSpacing: '-0.5px' }}
            >
              {formatCurrency(netWorth, defaultCurrency, true)}
            </h1>
            {netWorthChange && (
              <div className="flex items-center gap-2 mt-2">
                <span
                  className="text-sm font-mono font-semibold"
                  style={{ color: changeColor }}
                >
                  {isPositive ? '+' : ''}
                  {formatCurrency(netWorthChange.amount, defaultCurrency, true)}
                </span>
                <span
                  className="text-xs font-mono px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    background: `${changeColor}18`,
                    color: changeColor,
                    border: `1px solid ${changeColor}28`,
                  }}
                >
                  {netWorthChange.percent >= 0 ? '+' : ''}
                  {netWorthChange.percent.toFixed(2)}%
                </span>
                <span className="text-white/25 text-xs">vs {selectedPeriod.label} ago</span>
              </div>
            )}
          </div>

          {/* Chart */}
          {chartData.length > 1 ? (
            <NetWorthLineChart data={chartData} currency={defaultCurrency} />
          ) : (
            <div
              className="h-48 flex items-center justify-center rounded-xl"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <p className="text-white/20 text-sm">
                Not enough data yet — check back tomorrow
              </p>
            </div>
          )}

          {/* Metrics strip */}
          <div
            className="grid gap-4 pt-4"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.07)',
              gridTemplateColumns: `repeat(${
                4 + (liabilitiesTotal > 0 ? 0 : -1) + (monthIncome > 0 ? 0 : -1)
              }, 1fr)`,
            }}
          >
            <MetricCell
              label="Total Assets"
              value={formatCurrency(totalAssets, defaultCurrency, true)}
              color="#22C55E"
              sub={portfolioValue > 0 ? `Portfolio: ${formatCurrency(portfolioValue, defaultCurrency, true)}` : undefined}
            />
            {liabilitiesTotal > 0 && (
              <MetricCell
                label="Liabilities"
                value={formatCurrency(liabilitiesTotal, defaultCurrency, true)}
                color="#EF4444"
              />
            )}
            <MetricCell
              label="Month Spending"
              value={formatCurrency(monthSpending, defaultCurrency, true)}
              sub={`${monthExpenses.length} transactions`}
            />
            {monthIncome > 0 && (
              <MetricCell
                label="Cash Flow"
                value={`${monthCashFlow >= 0 ? '+' : ''}${formatCurrency(monthCashFlow, defaultCurrency, true)}`}
                color={monthCashFlow >= 0 ? '#22C55E' : '#EF4444'}
                sub={`Income: ${formatCurrency(monthIncome, defaultCurrency, true)}`}
              />
            )}
          </div>
        </div>
      </GlassCard>

      {/* Insights strip */}
      {insightsStrip && (
        <div>{insightsStrip}</div>
      )}

      {/* 2-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 items-start">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-5">

          {/* Wealth composition */}
          {totalAssets > 0 && (
            <GlassCard padding="md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white">Wealth Composition</h2>
                <p className="text-xs text-white/30">
                  {formatCurrency(totalAssets, defaultCurrency, true)} total assets
                </p>
              </div>
              <WealthCompositionBar
                segments={wealthSegments}
                total={totalAssets}
                liabilities={liabilitiesTotal}
                currency={defaultCurrency}
              />
              {/* Asset breakdown list */}
              {wealthSegments.filter(s => s.value > 1).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 mt-4 pt-4"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  {wealthSegments.filter(s => s.value > 1).map((s) => (
                    <div key={s.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                        <p className="text-xs text-white/50">{s.label}</p>
                      </div>
                      <p className="text-xs font-mono text-white/70">
                        {formatCurrency(s.value, defaultCurrency, true)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          )}

          {/* Spending summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <GlassCard padding="md">
              <div className="flex items-center justify-between mb-3">
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider">
                  Month Spending
                </p>
                {spendingVsLastMonth !== null && (
                  <span
                    className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full"
                    style={{
                      background: spendingVsLastMonth > 0
                        ? 'rgba(239,68,68,0.1)'
                        : 'rgba(34,197,94,0.1)',
                      color: spendingVsLastMonth > 0 ? '#EF4444' : '#22C55E',
                    }}
                  >
                    {spendingVsLastMonth > 0 ? '+' : ''}{spendingVsLastMonth.toFixed(0)}% vs last mo
                  </span>
                )}
              </div>
              <h3
                className="text-2xl font-bold font-mono"
                style={{ color: 'rgba(255,255,255,0.9)' }}
              >
                {formatCurrency(monthSpending, defaultCurrency, true)}
              </h3>
              <p className="text-xs text-white/30 mt-1">
                {monthExpenses.length} transaction{monthExpenses.length !== 1 ? 's' : ''} this month
              </p>
              {prevMonthSpending > 0 && (
                <p className="text-xs text-white/25 mt-0.5">
                  Last month: {formatCurrency(prevMonthSpending, defaultCurrency, true)}
                </p>
              )}
              <button
                onClick={() => navigate('/spending')}
                className="mt-3 text-[#10B981] text-xs hover:text-[#10B981]/70 transition-colors"
              >
                View spending →
              </button>
            </GlassCard>

            {monthIncome > 0 ? (
              <GlassCard padding="md">
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-3">
                  Cash Flow
                </p>
                <h3
                  className="text-2xl font-bold font-mono"
                  style={{ color: monthCashFlow >= 0 ? '#22C55E' : '#EF4444' }}
                >
                  {monthCashFlow >= 0 ? '+' : ''}
                  {formatCurrency(monthCashFlow, defaultCurrency, true)}
                </h3>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/30">Income</p>
                    <p className="text-xs font-mono text-[#22C55E]">
                      {formatCurrency(monthIncome, defaultCurrency, true)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-white/30">Expenses</p>
                    <p className="text-xs font-mono text-white/60">
                      {formatCurrency(monthSpending, defaultCurrency, true)}
                    </p>
                  </div>
                </div>
              </GlassCard>
            ) : (
              <GlassCard padding="md">
                <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-3">
                  Portfolio
                </p>
                <h3 className="text-2xl font-bold font-mono text-[#3B82F6]">
                  {formatCurrency(portfolioValue, defaultCurrency, true)}
                </h3>
                {holdings.length > 0 && (
                  <p className="text-xs text-white/30 mt-1">
                    {holdings.length} position{holdings.length !== 1 ? 's' : ''}
                    {totalAssets > 0 && ` · ${((portfolioValue / totalAssets) * 100).toFixed(0)}% of assets`}
                  </p>
                )}
                <button
                  onClick={() => navigate('/portfolio')}
                  className="mt-3 text-[#10B981] text-xs hover:text-[#10B981]/70 transition-colors"
                >
                  View portfolio →
                </button>
              </GlassCard>
            )}

          </div>

        </div>

        {/* ── RIGHT COLUMN (sticky rail) ── */}
        <div className="space-y-4 xl:sticky xl:top-6">

          {/* FIRE progress */}
          {fireTarget !== null && fireProgress !== null && (
            <GlassCard padding="md">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="text-white/70 text-sm font-semibold">🔥 FIRE Progress</p>
                  <p className="text-white/30 text-xs mt-0.5">
                    Target: {formatCurrency(fireTarget, defaultCurrency, true)}
                  </p>
                </div>
                <p
                  className="text-2xl font-bold font-mono leading-none"
                  style={{ color: fireProgress >= 100 ? '#22C55E' : '#10B981' }}
                >
                  {fireProgress.toFixed(1)}%
                </p>
              </div>

              <div className="my-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${fireProgress}%`,
                    background: fireProgress >= 100
                      ? 'linear-gradient(90deg,#10B981,#22C55E)'
                      : 'linear-gradient(90deg,#10B981,#34D399)',
                    transition: 'width 800ms cubic-bezier(0.34,1.56,0.64,1)',
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                {fireRemaining !== null && fireRemaining > 0 ? (
                  <p className="text-xs text-white/35">
                    {formatCurrency(fireRemaining, defaultCurrency, true)} remaining
                  </p>
                ) : (
                  <p className="text-xs text-[#22C55E]">🎉 Target reached!</p>
                )}
                {netWorth > 0 && fireTarget > 0 && (
                  <p className="text-xs text-white/25">
                    {formatCurrency(netWorth, defaultCurrency, true)} / {formatCurrency(fireTarget, defaultCurrency, true)}
                  </p>
                )}
              </div>
            </GlassCard>
          )}

          {/* Top holdings */}
          {holdings.length > 0 && (
            <GlassCard padding="md">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white">Top Holdings</h2>
                <button
                  onClick={() => navigate('/portfolio')}
                  className="text-[#10B981] text-xs hover:text-[#10B981]/70 transition-colors"
                >
                  View all →
                </button>
              </div>
              <div className="space-y-1">
                {holdings
                  .sort((a, b) => b.currentValue - a.currentValue)
                  .slice(0, 5)
                  .map((h) => (
                    <div
                      key={h.ticker}
                      onClick={() => navigate('/portfolio')}
                      className="flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer hover:bg-white/[0.08] transition-colors"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#10B981]/15 flex items-center justify-center flex-shrink-0">
                          <span className="text-[#10B981] text-[9px] font-bold leading-none">
                            {h.ticker.slice(0, 3)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium text-xs leading-tight">{h.ticker}</p>
                          <p className="text-white/30 text-[10px]">
                            {h.sharesHeld % 1 === 0
                              ? h.sharesHeld.toFixed(0)
                              : h.sharesHeld.toFixed(2)}{' '}
                            {h.sharesHeld === 1 ? 'share' : 'shares'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-white font-mono text-xs">
                          {formatCurrency(h.currentValue, defaultCurrency, true)}
                        </p>
                        <p
                          className="text-[10px] font-mono"
                          style={{ color: h.unrealizedGain >= 0 ? '#22C55E' : '#EF4444' }}
                        >
                          {h.unrealizedGain >= 0 ? '+' : ''}
                          {h.unrealizedGainPercent.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </GlassCard>
          )}

          {/* Activity feed */}
          <GlassCard padding="md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    setActivityFeedSettings({ showTransactions: !activityFeedShowTransactions })
                  }
                  className={`text-xs px-2 py-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#10B981]/50 ${
                    activityFeedShowTransactions
                      ? 'bg-[#10B981]/20 text-[#10B981]'
                      : 'bg-white/5 text-white/30 hover:text-white/50'
                  }`}
                >
                  💳
                </button>
                <button
                  onClick={() =>
                    setActivityFeedSettings({ showRecurring: !activityFeedShowRecurring })
                  }
                  className={`text-xs px-2 py-1 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#10B981]/50 ${
                    activityFeedShowRecurring
                      ? 'bg-[#10B981]/20 text-[#10B981]'
                      : 'bg-white/5 text-white/30 hover:text-white/50'
                  }`}
                >
                  🔄
                </button>
              </div>
            </div>

            {dueSoonActivity.length === 0 && recentTransactions.length === 0 ? (
              <EmptyState
                icon={
                  !activityFeedShowTransactions && !activityFeedShowRecurring ? '👁️' : '📋'
                }
                title={
                  !activityFeedShowTransactions && !activityFeedShowRecurring
                    ? 'All feeds hidden'
                    : 'No recent activity'
                }
                description={
                  !activityFeedShowTransactions && !activityFeedShowRecurring
                    ? 'Use the toggles to show transactions or recurring payments.'
                    : 'Add your first transaction in Spending.'
                }
                action={
                  activityFeedShowTransactions || activityFeedShowRecurring ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate('/spending')}
                    >
                      Go to Spending
                    </Button>
                  ) : undefined
                }
                className="py-6"
              />
            ) : (
              <div className="space-y-0.5">

                {/* Due soon section */}
                {dueSoonActivity.length > 0 && (
                  <>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider px-1 pb-1.5">
                      Due soon
                    </p>
                    {dueSoonActivity.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between px-2.5 py-2 rounded-xl"
                        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.10)' }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                            style={{ background: 'rgba(245,158,11,0.12)' }}
                          >
                            🔄
                          </span>
                          <div className="min-w-0">
                            <p className="text-white text-xs font-medium truncate leading-tight">{p.name}</p>
                            <p className="text-white/30 text-[10px] mt-0.5">
                              {formatDate(p.nextDueDate, 'short')}
                            </p>
                          </div>
                        </div>
                        <p
                          className="font-mono text-xs font-semibold ml-2 flex-shrink-0"
                          style={{ color: '#F59E0B' }}
                        >
                          {formatCurrency(p.amount, p.currency ?? defaultCurrency)}
                        </p>
                      </div>
                    ))}
                  </>
                )}

                {/* Recent transactions section */}
                {recentTransactions.length > 0 && (
                  <>
                    {dueSoonActivity.length > 0 && (
                      <div className="pt-2 pb-1">
                        <p className="text-[10px] text-white/30 uppercase tracking-wider px-1">
                          Recent
                        </p>
                      </div>
                    )}
                    {recentTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-white/[0.07] transition-colors"
                        style={{ background: 'rgba(255,255,255,0.035)' }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                            style={{ background: 'rgba(255,255,255,0.06)' }}
                          >
                            💳
                          </span>
                          <div className="min-w-0">
                            <p className="text-white text-xs font-medium truncate leading-tight">
                              {tx.category}
                            </p>
                            <p className="text-white/30 text-[10px] mt-0.5">
                              {formatDate(tx.date, 'short')}
                            </p>
                          </div>
                        </div>
                        <p
                          className="font-mono text-xs font-semibold ml-2 flex-shrink-0"
                          style={{ color: tx.type === 'expense' ? '#EF4444' : '#22C55E' }}
                        >
                          {tx.type === 'expense' ? '-' : '+'}
                          {formatCurrency(tx.convertedAmount, defaultCurrency)}
                        </p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </GlassCard>

        </div>
      </div>

      {/* Welcome empty state */}
      {!hasAnyData && (
        <GlassCard padding="lg" className="text-center py-8">
          <p className="text-4xl mb-3">💰</p>
          <h3 className="text-white font-semibold mb-2">Welcome to NetWorth Tracker!</h3>
          <p className="text-white/40 text-sm mb-4">
            Start by adding your portfolio holdings, assets, or transactions.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="primary" onClick={() => navigate('/portfolio')}>
              Add Holdings
            </Button>
            <Button variant="secondary" onClick={() => navigate('/spending')}>
              Add Transaction
            </Button>
            <Button variant="ghost" onClick={() => navigate('/settings')}>
              Add Assets
            </Button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
