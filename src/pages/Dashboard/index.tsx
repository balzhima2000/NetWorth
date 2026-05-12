import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useNetWorthStore } from '../../stores/networthStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useQuickAddStore } from '../../stores/quickAddStore';
import { calculateCurrentHoldings } from '../../utils/calculations';
import { formatCurrency, formatDate, getCurrentMonthYear, getCurrencySymbol } from '../../utils/formatters';
import tradeIcon from '../../assets/dashboard-icons/trade-icon.svg';
import incomeIcon from '../../assets/dashboard-icons/income-icon.svg';
import expenseIcon from '../../assets/dashboard-icons/expense-icon.svg';
import helloIcon from '../../assets/dashboard-icons/hello-icon.svg';
import settingsIcon from '../../assets/dashboard-icons/settings-icon.svg';

type DashboardPeriod = {
  label: '1W' | '1M' | '1Y' | 'YTD' | 'ALL';
  days: number | null;
};

type ChartPoint = {
  index: number;
  date: string;
  currentNetWorth: number;
  previousNetWorth: number;
};

function ActionIcon({ kind }: { kind: 'trade' | 'income' | 'expense' }) {
  const iconSource = kind === 'trade' ? tradeIcon : kind === 'income' ? incomeIcon : expenseIcon;
  return (
    <img
      src={iconSource}
      alt=""
      className="h-6 w-6"
    />
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const setQuickAddTarget = useQuickAddStore((s) => s.setTarget);

  const trades = usePortfolioStore((s) => s.trades);
  const currentPrices = usePortfolioStore((s) => s.currentPrices);
  const lastPriceUpdates = usePortfolioStore((s) => s.lastPriceUpdates);

  const manualEntries = useNetWorthStore((s) => s.manualEntries);
  const snapshots = useNetWorthStore((s) => s.snapshots);
  const addSnapshot = useNetWorthStore((s) => s.addSnapshot);
  const lastSnapshotDate = useNetWorthStore((s) => s.lastSnapshotDate);
  const getSnapshotsByRange = useNetWorthStore((s) => s.getSnapshotsByRange);

  const transactions = useTransactionStore((s) => s.transactions);
  const defaultCurrency = useSettingsStore((s) => s.defaultCurrency);
  const exchangeRates = useSettingsStore((s) => s.exchangeRates);
  const userNickname = useSettingsStore((s) => s.userNickname);
  const userName = useSettingsStore((s) => s.userName);
  const displayName = userNickname || userName || '';

  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>({ label: '1M', days: 30 });
  const [chartReady, setChartReady] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 });

  const periods = useMemo<DashboardPeriod[]>(() => {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const ytdDays = Math.max(Math.ceil((today.getTime() - startOfYear.getTime()) / 86400000) + 1, 1);

    return [
      { label: '1W', days: 7 },
      { label: '1M', days: 30 },
      { label: '1Y', days: 365 },
      { label: 'YTD', days: ytdDays },
      { label: 'ALL', days: null },
    ];
  }, []);

  const selectedPeriodDays = selectedPeriod.label === 'YTD'
    ? periods.find((period) => period.label === 'YTD')?.days ?? 30
    : selectedPeriod.days;

  const holdings = useMemo(
    () => calculateCurrentHoldings(trades, currentPrices, lastPriceUpdates, exchangeRates),
    [trades, currentPrices, lastPriceUpdates, exchangeRates]
  );

  const portfolioValue = holdings.reduce((sum, holding) => sum + holding.currentValue, 0);
  const assetsTotalManual = manualEntries.filter((entry) => !entry.isLiability).reduce((sum, entry) => sum + entry.value, 0);
  const liabilitiesTotal = manualEntries.filter((entry) => entry.isLiability).reduce((sum, entry) => sum + entry.value, 0);
  const totalAssets = portfolioValue + assetsTotalManual;
  const netWorth = totalAssets - liabilitiesTotal;

  const { month, year } = getCurrentMonthYear();
  const monthSpending = transactions
    .filter((transaction) => {
      const date = new Date(transaction.date);
      return date.getMonth() + 1 === month && date.getFullYear() === year && transaction.type === 'expense';
    })
    .reduce((sum, transaction) => sum + transaction.convertedAmount, 0);
  const monthIncome = transactions
    .filter((transaction) => {
      const date = new Date(transaction.date);
      return date.getMonth() + 1 === month && date.getFullYear() === year && transaction.type === 'income';
    })
    .reduce((sum, transaction) => sum + transaction.convertedAmount, 0);
  const monthCashFlow = monthIncome - monthSpending;

  const currentPeriodSnapshots = useMemo(
    () => getSnapshotsByRange(selectedPeriodDays),
    [getSnapshotsByRange, selectedPeriodDays, snapshots]
  );

  const comparisonSnapshots = useMemo(
    () => getSnapshotsByRange(selectedPeriodDays === null ? null : selectedPeriodDays * 2),
    [getSnapshotsByRange, selectedPeriodDays, snapshots]
  );

  const chartSnapshots = useMemo(() => {
    const seenDates = new Set<string>();
    return comparisonSnapshots.filter((snapshot) => {
      if (seenDates.has(snapshot.date)) return false;
      seenDates.add(snapshot.date);
      return true;
    });
  }, [comparisonSnapshots]);

  const chartData = useMemo<ChartPoint[]>(() => {
    if (chartSnapshots.length === 0) return [];

    if (chartSnapshots.length < 4) {
      return chartSnapshots.map((snapshot, index) => ({
        index,
        date: snapshot.date,
        currentNetWorth: snapshot.netWorth,
        previousNetWorth: snapshot.netWorth,
      }));
    }

    const half = Math.floor(chartSnapshots.length / 2);
    if (half < 2) return [];

    const previous = chartSnapshots.slice(0, half);
    const current = chartSnapshots.slice(chartSnapshots.length - half);
    const seenDates = new Set<string>();

    return current.reduce<ChartPoint[]>((points, snapshot, index) => {
      if (seenDates.has(snapshot.date)) return points;
      seenDates.add(snapshot.date);
      points.push({
        index: points.length,
        date: snapshot.date,
        currentNetWorth: snapshot.netWorth,
        previousNetWorth: previous[index]?.netWorth ?? previous[previous.length - 1]?.netWorth ?? snapshot.netWorth,
      });
      return points;
    }, []);
  }, [chartSnapshots]);

  const hasComparisonSeries = useMemo(() => chartSnapshots.length >= 4, [chartSnapshots.length]);

  const netWorthChange = useMemo(() => {
    if (currentPeriodSnapshots.length < 2) return null;
    const first = currentPeriodSnapshots[0].netWorth;
    const last = currentPeriodSnapshots[currentPeriodSnapshots.length - 1].netWorth;
    return {
      amount: last - first,
      percent: first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0,
    };
  }, [currentPeriodSnapshots]);

  const chartRangeLabel = useMemo(() => {
    if (currentPeriodSnapshots.length === 0) return selectedPeriod.label;
    const start = formatDate(currentPeriodSnapshots[0].date, 'short');
    const end = formatDate(currentPeriodSnapshots[currentPeriodSnapshots.length - 1].date, 'short');
    return `${start} · ${end}`;
  }, [currentPeriodSnapshots, selectedPeriod.label]);

  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todaySnapshot = useMemo(
    () => snapshots.find((snapshot) => snapshot.date === todayIso) ?? null,
    [snapshots, todayIso]
  );

  useEffect(() => {
    document.title = 'Dashboard — NetWorth Tracker';
  }, []);

  useEffect(() => {
    setChartReady(false);
    const raf = window.requestAnimationFrame(() => setChartReady(true));
    return () => window.cancelAnimationFrame(raf);
  }, [selectedPeriod.label, chartData.length]);

  useEffect(() => {
    const element = chartContainerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      setChartSize({ width, height });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const needsInsert = !todaySnapshot;
    const needsUpdate = !!todaySnapshot && (
      todaySnapshot.totalAssets !== totalAssets ||
      todaySnapshot.totalLiabilities !== liabilitiesTotal ||
      todaySnapshot.netWorth !== netWorth ||
      todaySnapshot.portfolioValue !== portfolioValue ||
      todaySnapshot.manualAssetsTotal !== assetsTotalManual
    );

    if (needsInsert || needsUpdate) {
      addSnapshot({
        id: todaySnapshot?.id ?? crypto.randomUUID(),
        date: todayIso,
        totalAssets,
        totalLiabilities: liabilitiesTotal,
        netWorth,
        portfolioValue,
        manualAssetsTotal: assetsTotalManual,
      });
    }
  }, [
    addSnapshot,
    assetsTotalManual,
    liabilitiesTotal,
    netWorth,
    portfolioValue,
    totalAssets,
    todayIso,
    todaySnapshot,
    lastSnapshotDate,
    currentPrices,
    manualEntries,
    trades,
  ]);

  const chartTickIndices = useMemo(() => {
    if (chartData.length <= 5) return chartData.map((_, index) => index);
    const lastIndex = chartData.length - 1;
    const candidates = new Set<number>();
    for (let i = 0; i < 5; i += 1) {
      candidates.add(Math.round((lastIndex * i) / 4));
    }
    return [...candidates];
  }, [chartData]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#1f1f1f' }}>
      {/* Header */}
      <header className="px-4 sm:px-5 py-4 sm:py-5 flex items-center justify-between gap-4 sm:gap-9">
        <div className="px-2.5 py-1.5 rounded-full flex items-center gap-1.5" style={{ backgroundColor: '#292929' }}>
          <img src={helloIcon} alt="" className="w-3.5 h-3.5" />
          <p className="text-sm sm:text-base leading-6" style={{ color: '#a3a3a3', fontFamily: 'var(--font-ui)' }}>
            Hello, {displayName}, it&apos;s{' '}
            <span style={{ color: '#d4d4d4' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).replace(',', '')}
            </span>
          </p>
        </div>
        <button onClick={() => navigate('/settings')} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ color: 'var(--color-text)' }} aria-label="Settings">
          <img src={settingsIcon} alt="" className="w-6 h-6" />
        </button>
      </header>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-5 pb-24 sm:pb-6">
        <div className="max-w-md mx-auto space-y-4">
          {/* Hero Card */}
          <div className="rounded-3xl overflow-hidden" style={{ backgroundColor: '#404040' }}>
            {/* Inner top card */}
            <div className="mx-1 mt-1 rounded-[20px] px-4 py-3 flex flex-col gap-3" style={{ backgroundColor: '#525252' }}>
              {/* Label */}
              <p className="text-xs sm:text-sm leading-4" style={{ color: '#a3a3a3', fontFamily: 'var(--font-ui)' }}>
                Current Net Worth
              </p>

              {/* Number row */}
              <div className="relative h-12 sm:h-14 flex items-start">
                <span className="text-2xl sm:text-3xl font-bold leading-10 mt-0.5" style={{ color: '#a3a3a3', fontFamily: 'var(--font-mono)' }}>
                  {getCurrencySymbol(defaultCurrency)}
                </span>
                <span className="text-4xl sm:text-6xl font-semibold leading-tight ml-1" style={{ color: '#e5e5e5', fontFamily: 'var(--font-mono)' }}>
                  {Math.floor(Math.abs(netWorth)).toLocaleString('en-US')}
                </span>
                <span className="text-xl sm:text-3xl font-bold leading-10 mt-4 sm:mt-5 ml-1" style={{ color: '#a3a3a3', fontFamily: 'var(--font-mono)' }}>
                  .{String(Math.round((Math.abs(netWorth) % 1) * 100)).padStart(2, '0')}
                </span>
              </div>

              {/* Monthly change */}
              <p className="text-xs sm:text-sm font-medium leading-5">
                {monthCashFlow === 0 ? (
                  <span style={{ color: '#d4d4d4', fontFamily: 'var(--font-ui)' }}>No change this month</span>
                ) : monthCashFlow > 0 ? (
                  <>
                    <span style={{ color: '#d4d4d4', fontFamily: 'var(--font-ui)' }}>You&apos;re up </span>
                    <span style={{ color: '#D6F377', fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(Math.abs(monthCashFlow), defaultCurrency)}
                    </span>
                    <span style={{ color: '#d4d4d4', fontFamily: 'var(--font-ui)' }}> this month</span>
                  </>
                ) : (
                  <>
                    <span style={{ color: '#d4d4d4', fontFamily: 'var(--font-ui)' }}>You&apos;re down </span>
                    <span style={{ color: '#F39377', fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(Math.abs(monthCashFlow), defaultCurrency)}
                    </span>
                    <span style={{ color: '#d4d4d4', fontFamily: 'var(--font-ui)' }}> this month</span>
                  </>
                )}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-around px-4 py-4">
              {[
                { key: 'trade', label: 'Trade', target: '/portfolio', action: () => { setQuickAddTarget('trade'); navigate('/portfolio'); } },
                { key: 'income', label: 'Add Income', target: '/spending', action: () => { setQuickAddTarget('income'); navigate('/spending'); } },
                { key: 'expense', label: 'Log Expense', target: '/spending', action: () => { setQuickAddTarget('expense'); navigate('/spending'); } },
              ].map((action) => (
                <button key={action.key} onClick={action.action} className="flex flex-col items-center gap-2">
                  <span className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#a3a3a3' }}>
                    <ActionIcon kind={action.key as 'trade' | 'income' | 'expense'} />
                  </span>
                  <span className="text-xs leading-4" style={{ color: '#a3a3a3', fontFamily: 'var(--font-ui)' }}>
                    {action.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Period selector */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {periods.map((period) => {
              const active = selectedPeriod.label === period.label;
              return (
                <button
                  key={period.label}
                  onClick={() => setSelectedPeriod(period)}
                  className="px-4 sm:px-5 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors flex-shrink-0"
                  style={{
                    backgroundColor: active ? '#292929' : '#1f1f1f',
                    color: '#d4d4d4',
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  {period.label}
                </button>
              );
            })}
          </div>

          {/* Chart section */}
          <section className="rounded-[10px] overflow-hidden" style={{ backgroundColor: '#292929', minHeight: '320px', maxHeight: '384px' }}>
            <div className="p-4 sm:p-5 h-full flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm sm:text-lg leading-7" style={{ color: '#D6F377', fontFamily: 'var(--font-ui)' }}>
                    {chartRangeLabel}
                  </p>
                  <p className="text-xs sm:text-sm leading-5 mt-1" style={{ color: '#a3a3a3', fontFamily: 'var(--font-ui)' }}>
                    {hasComparisonSeries ? 'vs. last period' : 'net worth trend'}
                  </p>
                </div>
                {netWorthChange && (
                  <div className="px-2 sm:px-2.5 py-1 rounded-full text-xs sm:text-sm font-medium flex-shrink-0" style={{ backgroundColor: '#3c3c3c', color: '#D6F377', fontFamily: 'var(--font-mono)' }}>
                    {netWorthChange.percent >= 0 ? '+' : ''}{netWorthChange.percent.toFixed(2)}%
                  </div>
                )}
              </div>

              <div ref={chartContainerRef} className="h-[240px] sm:h-[260px]">
                {chartReady && chartData.length > 0 && chartSize.width > 0 && chartSize.height > 0 ? (
                  <LineChart width={chartSize.width} height={chartSize.height} data={chartData} margin={{ top: 0, right: 8, left: -20, bottom: 20 }}>
                      <CartesianGrid stroke="#3c3c3c" strokeDasharray="0" vertical={false} />
                      <XAxis
                        dataKey="index"
                        type="number"
                        domain={[0, Math.max(chartData.length - 1, 0)]}
                        ticks={chartTickIndices}
                        tickFormatter={(value) => {
                          const index = typeof value === 'number' ? value : Number(value);
                          const date = chartData[index]?.date;
                          return date ? formatDate(date, 'short') : '';
                        }}
                        tick={{ fill: '#666', fontSize: 9, fontFamily: 'var(--font-mono)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(value) => formatCurrency(value, defaultCurrency, true)}
                        tick={{ fill: '#666', fontSize: 8, fontFamily: 'var(--font-mono)' }}
                        axisLine={false}
                        tickLine={false}
                        width={50}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#3c3c3c', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }}
                        formatter={(value: number | undefined) => (value !== undefined ? formatCurrency(value, defaultCurrency) : '')}
                      />
                      {hasComparisonSeries && (
                        <Line
                          type="monotone"
                          dataKey="previousNetWorth"
                          stroke="rgba(255, 255, 255, 0.2)"
                          strokeWidth={1.5}
                          dot={false}
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="currentNetWorth"
                        stroke="#D6F377"
                        strokeWidth={2}
                        dot={(props) => {
                          const { cx, cy, payload } = props;
                          const isLast = payload.index === chartData.length - 1;
                          return isLast ? <circle cx={cx} cy={cy} r={4} fill="#D6F377" /> : null;
                        }}
                      />
                    </LineChart>
                ) : (
                  <div className="flex items-center justify-center h-full" style={{ color: '#a3a3a3' }}>
                    <p className="text-xs sm:text-sm">Not enough data yet</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Recent activity */}
          <section className="flex flex-col gap-1.5">
            <h2 className="text-base sm:text-lg leading-7" style={{ color: '#d4d4d4', fontFamily: 'var(--font-ui)' }}>
              Recent activity
            </h2>
            {transactions
              .slice()
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 3)
              .map((tx) => {
                const isIncome = tx.type === 'income';
                const bgColor = isIncome ? 'rgba(62, 84, 45, 1)' : 'rgba(217, 119, 6, 0.2)';
                const textColor = isIncome ? '#D6F377' : '#F39377';

                return (
                  <div key={tx.id} className="px-4 py-2.5 rounded-[10px] flex flex-col gap-2.5" style={{ backgroundColor: bgColor }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs leading-4 flex-shrink-0" style={{ color: '#a3a3a3', fontFamily: 'var(--font-ui)' }}>
                        {isIncome ? 'Income added' : 'Expense logged'}
                      </span>
                      <span className="text-xs sm:text-sm font-medium leading-5 flex-shrink-0" style={{ color: '#a3a3a3', fontFamily: 'var(--font-ui)' }}>
                        {formatDate(tx.date, 'short')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base sm:text-xl leading-8 truncate" style={{ color: '#e5e5e5', fontFamily: 'var(--font-ui)' }}>
                        {tx.notes || tx.category || 'Transaction'}
                      </span>
                      <span className="text-base sm:text-xl leading-8 font-mono flex-shrink-0" style={{ color: textColor, fontFamily: 'var(--font-mono)' }}>
                        {isIncome ? '+' : '-'}{formatCurrency(Math.abs(tx.convertedAmount), defaultCurrency)}
                      </span>
                    </div>
                  </div>
                );
              })}

            <button
              onClick={() => navigate('/spending')}
              className="px-4 py-2 rounded-3xl flex items-center justify-between mt-2"
              style={{ backgroundColor: '#292929' }}
            >
              <span className="text-xs sm:text-sm font-medium leading-5" style={{ color: '#a3a3a3', fontFamily: 'var(--font-ui)' }}>
                See all
              </span>
              <span className="text-xs sm:text-sm font-medium leading-5" style={{ color: '#a3a3a3', fontFamily: 'var(--font-ui)' }}>
                →
              </span>
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}