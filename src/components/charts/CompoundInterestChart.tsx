import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { CompoundChartPoint } from '../../types/index';
import { formatCurrency } from '../../utils/formatters';

interface CompoundInterestChartProps {
  data: CompoundChartPoint[];
  currency: string;
}

export function CompoundInterestChart({ data, currency }: CompoundInterestChartProps) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
          formatter={(value: number | undefined, name: string | undefined) => [
            value !== undefined ? formatCurrency(value, currency) : '',
            name === 'contributed' ? 'Contributed' : 'Growth',
          ]}
          labelFormatter={(label) => `Year ${label}`}
        />
        <Area
          type="monotone"
          dataKey="contributed"
          stackId="1"
          stroke="#3B82F6"
          fill="#3B82F6"
          fillOpacity={0.30}
        />
        <Area
          type="monotone"
          dataKey="growth"
          stackId="1"
          stroke="#D6F377"
          fill="#D6F377"
          fillOpacity={0.35}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
