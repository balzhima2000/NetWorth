import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import type { FireProjectionPoint } from '../../types/index';
import { formatCurrency } from '../../utils/formatters';

interface FireProjectionChartProps {
  data: FireProjectionPoint[];
  fireTarget: number;
  currency: string;
}

export function FireProjectionChart({ data, fireTarget, currency }: FireProjectionChartProps) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid stroke="#3c3c3c" strokeDasharray="0" vertical={false} />
        <XAxis
          dataKey="year"
          stroke="#666"
          fontSize={11}
          tickFormatter={(v) => `Yr ${v}`}
          tick={{ fill: '#666', fontSize: 9, fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          stroke="#666"
          fontSize={11}
          width={70}
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
          formatter={(value: number | undefined) => value !== undefined ? [formatCurrency(value, currency), 'Portfolio'] : ['', 'Portfolio']}
          labelFormatter={(label) => `Year ${label}`}
        />
        <ReferenceLine
          y={fireTarget}
          stroke="#f59e0b"
          strokeDasharray="8 4"
          strokeWidth={2}
          label={{
            value: `FIRE Target: ${formatCurrency(fireTarget, currency, true)}`,
            position: 'right',
            fill: '#f59e0b',
            fontSize: 11,
          }}
        />
        <Line
          type="monotone"
          dataKey="portfolioValue"
          stroke="#D6F377"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, fill: '#D6F377' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
