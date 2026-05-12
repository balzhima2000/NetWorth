import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { NetWorthSnapshot } from '../../types/index';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface NetWorthLineChartProps {
  data: NetWorthSnapshot[];
  currency: string;
}

export function NetWorthLineChart({ data, currency }: NetWorthLineChartProps) {
  if (data.length === 0) return null;

  const isUp = data.length > 1 && data[data.length - 1].netWorth >= data[0].netWorth;
  const lineColor = isUp ? '#D6F377' : '#F39377';

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid stroke="#3c3c3c" strokeDasharray="0" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => formatDate(d, 'short')}
          stroke="#666"
          fontSize={11}
          tick={{ fill: '#666', fontSize: 9, fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => formatCurrency(v, currency, true)}
          stroke="#666"
          fontSize={11}
          width={70}
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
          formatter={(value: number | undefined) => value !== undefined ? [formatCurrency(value, currency), 'Net Worth'] : ['', 'Net Worth']}
          labelFormatter={(label) => formatDate(label as string, 'long')}
        />
        <Line
          type="monotone"
          dataKey="netWorth"
          stroke={lineColor}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: lineColor }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
