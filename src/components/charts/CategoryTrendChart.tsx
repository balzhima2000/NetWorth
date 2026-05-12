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
import type { CategoryMonthData } from '../../utils/spendingAnalytics';
import type { SpendingCategory } from '../../types/index';

const FALLBACK_COLORS = ['#00E600', '#3B82F6', '#F59E0B', '#FF5555', '#8B5CF6'];

interface CategoryTrendChartProps {
  data: CategoryMonthData[];
  categories: string[];
  categoryInfo: SpendingCategory[];
  currency: string;
}

export function CategoryTrendChart({
  data,
  categories,
  categoryInfo,
  currency,
}: CategoryTrendChartProps) {
  if (data.length === 0 || categories.length === 0) return null;

  const getMeta = (catId: string, index: number) => {
    const info = categoryInfo.find((c) => c.id === catId);
    return {
      label: info ? `${info.emoji} ${info.name}` : catId,
      color: info?.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    };
  };

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
            if (value === undefined) return ['', name ?? ''];
            const info = categoryInfo.find((c) => c.id === name);
            return [
              formatCurrency(Number.isFinite(numericValue) ? numericValue : 0, currency),
              info ? `${info.emoji} ${info.name}` : (name ?? ''),
            ];
          }}
        />
        <Legend
          formatter={(value) => {
            const info = categoryInfo.find((c) => c.id === value);
            return info ? `${info.emoji} ${info.name}` : value;
          }}
          wrapperStyle={{ fontSize: 11, color: '#a3a3a3', paddingTop: 8 }}
        />
        {categories.map((cat, i) => {
          const { color } = getMeta(cat, i);
          return (
            <Bar
              key={cat}
              dataKey={cat}
              stackId="stack"
              fill={color}
              radius={i === categories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            />
          );
        })}
      </BarChart>
    </ResponsiveContainer>
  );
}
