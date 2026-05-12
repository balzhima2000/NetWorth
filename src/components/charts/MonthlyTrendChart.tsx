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
        <CartesianGrid stroke="#3c3c3c" strokeDasharray="0" vertical={false} />
        <XAxis dataKey="label" stroke="#666" fontSize={11} tick={{ fill: '#666', fontSize: 9, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
        <YAxis
          stroke="#666"
          fontSize={11}
          width={65}
          tickFormatter={(v) => formatCurrency(v, currency, true)}
          tick={{ fill: '#666', fontSize: 8, fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#3c3c3c',
            border: 'none',
            borderRadius: 10,
            color: '#fff',
            fontSize: 12,
          }}
          formatter={(value: number | string | undefined, name: string | undefined) => {
            const numericValue = typeof value === 'number' ? value : Number(value);
            if (!Number.isFinite(numericValue)) return ['', name ?? ''];
            return [
              formatCurrency(numericValue, currency),
              name === 'expenses' ? 'Expenses' : 'Income',
            ];
          }}
        />
        <Legend
          formatter={(value) => (value === 'expenses' ? 'Expenses' : 'Income')}
          wrapperStyle={{ fontSize: 11, color: '#a3a3a3', paddingTop: 8 }}
        />
        <Bar dataKey="expenses" fill="#F39377" radius={[4, 4, 0, 0]} />
        <Bar dataKey="income" fill="#D6F377" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
