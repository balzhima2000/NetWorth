import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';

interface SpendingBarData {
  label: string;
  amount: number;
}

interface SpendingBarChartProps {
  data: SpendingBarData[];
  currency: string;
  color?: string;
}

export function SpendingBarChart({
  data,
  currency,
  color = '#D6F377',
}: SpendingBarChartProps) {
  // Default to the new accent colour
  const resolvedColor = color === '#00E600' ? '#D6F377' : color;
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid stroke="#3c3c3c" strokeDasharray="0" vertical={false} />
        <XAxis dataKey="label" stroke="#666" fontSize={11} tick={{ fill: '#666', fontSize: 9, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
        <YAxis
          stroke="#666"
          fontSize={11}
          width={60}
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
          formatter={(value: number | undefined) => value !== undefined ? [formatCurrency(value, currency), 'Spent'] : ['', 'Spent']}
        />
        <Bar dataKey="amount" fill={resolvedColor} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
