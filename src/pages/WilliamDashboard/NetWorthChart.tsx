/**
 * Two-line Recharts net-worth chart.
 * Primary line = color/accent (neutral near-black).
 * Comparison line = color/text-muted (grey).
 * Hover: ChartTooltip + vertical crosshair.
 */
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';

interface DataPoint { date: string; value: number; }

interface NetWorthChartProps {
  data: DataPoint[];
  comparison?: DataPoint[];
  currency: string;
  empty?: boolean;
}

// Merge primary + comparison into one array keyed by date
function mergeData(primary: DataPoint[], comparison: DataPoint[]) {
  const map: Record<string, { date: string; primary?: number; comparison?: number }> = {};
  primary.forEach((p) => { map[p.date] = { date: p.date, primary: p.value }; });
  comparison.forEach((c) => {
    if (map[c.date]) map[c.date].comparison = c.value;
    else map[c.date] = { date: c.date, comparison: c.value };
  });
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

function formatAxisDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function CustomTooltip({ active, payload, label, currency }: any) {
  if (!active || !payload?.length) return null;
  const primary = payload.find((p: any) => p.dataKey === 'primary');
  return (
    <div className="rounded-[8px] border border-line bg-surface px-3 py-2 shadow-none">
      <p className="ty-label text-muted mb-1">{formatAxisDate(label)}</p>
      {primary && (
        <p className="num text-[14px] font-semibold text-ink">
          {formatCurrency(primary.value, currency)}
        </p>
      )}
    </div>
  );
}

export function NetWorthChart({ data, comparison = [], currency, empty = false }: NetWorthChartProps) {
  if (empty || data.length < 2) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="ty-body text-muted text-center">No data yet.<br />Your chart will appear as snapshots accumulate.</p>
      </div>
    );
  }

  const merged = mergeData(data, comparison);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={merged} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid
          horizontal vertical={false}
          stroke="var(--w-line)"
          strokeDasharray="0"
          strokeWidth={1}
          strokeOpacity={0.6}
        />
        <XAxis
          dataKey="date"
          tickFormatter={formatAxisDate}
          tick={{ fill: 'var(--w-muted)', fontSize: 11, fontFamily: 'inherit' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          minTickGap={48}
        />
        <YAxis
          tickFormatter={(v) => formatCurrency(v, currency, true)}
          tick={{ fill: 'var(--w-muted)', fontSize: 11, fontFamily: 'inherit' }}
          axisLine={false}
          tickLine={false}
          width={64}
        />
        <Tooltip
          content={<CustomTooltip currency={currency} />}
          cursor={{ stroke: 'var(--w-line)', strokeWidth: 1 }}
        />
        {/* Comparison line — muted grey */}
        {comparison.length > 0 && (
          <Line
            type="monotone"
            dataKey="comparison"
            stroke="var(--w-muted)"
            strokeWidth={1.5}
            dot={false}
            activeDot={false}
            connectNulls
          />
        )}
        {/* Primary line — accent (near-black / white in dark) */}
        <Line
          type="monotone"
          dataKey="primary"
          stroke="var(--w-accent)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: 'var(--w-accent)', stroke: 'var(--w-surface)', strokeWidth: 2 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
