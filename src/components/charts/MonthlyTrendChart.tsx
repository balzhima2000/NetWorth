import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import type { MonthlyTotal } from '../../utils/spendingAnalytics';

interface MonthlyTrendChartProps {
  data: MonthlyTotal[];
  currency: string;
}

export function MonthlyTrendChart({ data, currency }: MonthlyTrendChartProps) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="label" stroke="rgba(255,255,255,0.25)" fontSize={11} />
        <YAxis
          stroke="rgba(255,255,255,0.25)"
          fontSize={11}
          width={65}
          tickFormatter={(v) => formatCurrency(v, currency, true)}
        />
        <Tooltip
          contentStyle={{
            background: '#111816',
            border: '1px solid rgba(255,255,255,0.09)',
            borderRadius: 12,
            color: 'white',
            fontSize: 12,
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={((value: number | undefined, name: string | undefined) => value !== undefined ? [
            formatCurrency(value, currency),
            name === 'expenses' ? 'Expenses' : 'Income',
          ] : ['', name ?? '']) as any}
        />
        <Legend
          formatter={(value) => (value === 'expenses' ? 'Expenses' : 'Income')}
          wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', paddingTop: 8 }}
        />
        <Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
        <Bar dataKey="income" fill="#22C55E" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
