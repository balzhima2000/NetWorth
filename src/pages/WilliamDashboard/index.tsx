/**
 * William Dashboard — redesigned implementation.
 * Scoped under .william so the old design system is untouched.
 * Route: /william/dashboard
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Card, ActionButton, RangeSelector, Icon } from '../../components/william';
import { NetWorthChart } from './NetWorthChart';
import { useDashboardData, type RangeOption } from './useDashboardData';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { cn } from '../../components/william/cn';

const RANGES: RangeOption[] = ['30D', '3M', '6M', '1Y', 'All'];

// ── Reusable sub-components ───────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="ty-label text-muted mb-3">{children}</p>;
}

function BreakdownBar({ items }: { items: { label: string; value: number }[] }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total <= 0) return null;
  const COLORS = ['var(--w-ink)', 'var(--w-positive)', 'var(--w-info)', 'var(--w-muted)'];
  return (
    <div className="flex flex-col gap-3">
      {/* Stacked bar */}
      <div className="flex h-2 w-full overflow-hidden rounded-full">
        {items.map((item, i) => (
          <div
            key={item.label}
            style={{ width: `${(item.value / total) * 100}%`, background: COLORS[i % COLORS.length] }}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="ty-body text-secondary">{item.label}</span>
            </div>
            <span className="num ty-body text-ink">{formatCurrency(item.value, 'USD')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FireProgressBar({ progress }: { progress: number }) {
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-raised">
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-accent transition-all duration-500"
        style={{ width: `${Math.max(progress, 2)}%` }}
      />
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export default function WilliamDashboard() {
  const navigate = useNavigate();
  const [range, setRange] = useState<RangeOption>('3M');
  const d = useDashboardData(range);

  // Action handlers — navigate to relevant pages (no modal hook yet)
  const openIncome  = () => navigate('/spending');
  const openExpense = () => navigate('/spending');

  if (d.isEmpty) {
    return (
      <div className="william flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-4">
        <Icon name="portfolio" size={48} className="text-muted" />
        <h1 className="ty-h1 text-ink">Welcome to William</h1>
        <p className="ty-body text-secondary text-center max-w-sm">
          Add your first trade or transaction to start tracking your net worth.
        </p>
      </div>
    );
  }

  const deltaPositive = d.periodDelta ? d.periodDelta.abs >= 0 : true;

  return (
    <div className="william min-h-screen bg-canvas pb-32 md:pb-0">
      <div className="mx-auto max-w-[1200px] px-4 pt-6 md:px-6">

        {/* Greeting */}
        {d.userName && (
          <p className="ty-body text-muted mb-4">Hello, {d.userName}</p>
        )}

        {/* ── Row 1: net-worth card + chart ── */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[360px_1fr]">

          {/* Net Worth Card */}
          <Card className="p-6 flex flex-col gap-4">
            <p className="ty-label text-muted">CURRENT NET WORTH</p>
            <p className={cn('ty-display num leading-none', d.netWorth < 0 ? 'text-negative' : 'text-ink')}>
              {formatCurrency(d.netWorth, d.defaultCurrency)}
            </p>
            {d.periodDelta && (
              <Badge tone={deltaPositive ? 'positive' : 'negative'}>
                {deltaPositive ? '↑' : '↓'} {formatCurrency(Math.abs(d.periodDelta.abs), d.defaultCurrency)} this period
              </Badge>
            )}
            {/* Action buttons */}
            <div className="flex gap-8 pt-2">
              <ActionButton action="trade" onClick={() => navigate('/portfolio')} />
              <ActionButton action="income" onClick={openIncome} />
              <ActionButton action="expense" onClick={openExpense} />
            </div>
          </Card>

          {/* Chart Card */}
          <Card className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <p className="ty-body text-ink font-semibold">
                  {d.chartData.length >= 2
                    ? `${formatDate(d.chartData[0].date, 'short')} — ${formatDate(d.chartData[d.chartData.length-1].date, 'short')}`
                    : 'Net Worth'}
                </p>
                {d.periodDelta && (
                  <Badge tone={deltaPositive ? 'positive' : 'negative'}>
                    {deltaPositive ? '+' : ''}{d.periodDelta.pct.toFixed(2)}%
                  </Badge>
                )}
              </div>
              <RangeSelector
                options={RANGES}
                value={range}
                onChange={(v) => setRange(v as RangeOption)}
              />
            </div>
            <div className="h-[200px] md:h-[240px]">
              <NetWorthChart
                data={d.chartData}
                comparison={d.comparisonData}
                currency={d.defaultCurrency}
                empty={d.chartData.length < 2}
              />
            </div>
          </Card>
        </div>

        {/* ── Row 2: breakdown ── */}
        {d.breakdown.length > 0 && (
          <Card className="mt-4 p-6">
            <SectionLabel>NET WORTH BREAKDOWN</SectionLabel>
            <BreakdownBar items={d.breakdown} />
          </Card>
        )}

        {/* ── Row 3: FIRE + Portfolio + This Month ── */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">

          {/* FIRE Progress */}
          <Card className="p-6 border-accent col-span-1 md:col-span-1 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="ty-label text-muted">FIRE PROGRESS</p>
              <button
                className="text-muted hover:text-ink transition-colors"
                onClick={() => navigate('/fire')}
                aria-label="Go to FIRE page"
              >
                <Icon name="fire" size={16} />
              </button>
            </div>
            {d.fireProgress !== null ? (
              <>
                <p className="ty-h1 num text-ink">{Math.round(d.fireProgress)}%</p>
                <FireProgressBar progress={d.fireProgress} />
                {d.effectiveFireTarget && (
                  <p className="ty-body text-secondary">
                    {formatCurrency(d.netWorth, d.defaultCurrency)} of {formatCurrency(d.effectiveFireTarget, d.defaultCurrency)}
                  </p>
                )}
              </>
            ) : (
              <p className="ty-body text-muted">Set your FIRE goal in settings.</p>
            )}
          </Card>

          {/* Portfolio */}
          <Card className="p-6 flex flex-col gap-2">
            <p className="ty-label text-muted">PORTFOLIO</p>
            <p className="ty-h1 num text-ink">{formatCurrency(d.portfolioValue, d.defaultCurrency)}</p>
            {d.holdings.length > 0 && (
              <Badge tone={d.holdings.reduce((s, h) => s + h.unrealizedGain, 0) >= 0 ? 'positive' : 'negative'}>
                {d.holdings.reduce((s, h) => s + h.unrealizedGain, 0) >= 0 ? '↑' : '↓'}{' '}
                {formatCurrency(Math.abs(d.holdings.reduce((s, h) => s + h.unrealizedGain, 0)), d.defaultCurrency)} total gain
              </Badge>
            )}
          </Card>

          {/* This Month */}
          <Card className="p-6 flex flex-col gap-2">
            <p className="ty-label text-muted">THIS MONTH</p>
            <p className={cn('ty-h1 num', d.monthNet >= 0 ? 'text-ink' : 'text-negative')}>
              {d.monthNet >= 0 ? '' : '−'}{formatCurrency(Math.abs(d.monthNet), d.defaultCurrency)}
            </p>
            <p className="ty-body text-secondary">
              {d.monthTransactions.length} transaction{d.monthTransactions.length !== 1 ? 's' : ''}
            </p>
          </Card>
        </div>

        {/* ── Row 4: Recent activity ── */}
        {d.recentActivity.length > 0 && (
          <div className="mt-6">
            <h2 className="ty-h2 text-ink mb-4">Recent activity</h2>
            <div className="flex flex-col gap-px">
              {d.recentActivity.map((tx) => (
                <Card
                  key={tx.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-raised transition-colors"
                >
                  <div className="flex flex-col gap-0.5">
                    <p className={cn('ty-label', tx.type === 'expense' ? 'text-negative' : 'text-positive')}>
                      {tx.type === 'expense' ? 'EXPENSE LOGGED' : 'INCOME ADDED'}
                    </p>
                    <p className="ty-body text-ink">{tx.notes || tx.category}</p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <p className="ty-label text-muted">{formatDate(tx.date, 'short').toUpperCase()}</p>
                    <p className={cn('num ty-body font-semibold', tx.type === 'expense' ? 'text-negative' : 'text-positive')}>
                      {tx.type === 'expense' ? '−' : '+'}{formatCurrency(tx.convertedAmount, d.defaultCurrency)}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
            <button
              className="mt-2 flex w-full items-center justify-between px-4 py-3 ty-body text-secondary hover:text-ink transition-colors"
              onClick={() => navigate('/spending')}
            >
              <span>See all</span>
              <span>→</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
