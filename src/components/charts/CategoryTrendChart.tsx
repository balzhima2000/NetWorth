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

const FALLBACK_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

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
          formatter={((value: number | undefined, name: string | undefined) => {
            if (value === undefined) return ['', name ?? ''];
            const info = categoryInfo.find((c) => c.id === name);
            return [
              formatCurrency(value, currency),
              info ? `${info.emoji} ${info.name}` : (name ?? ''),
            ];
          }) as any}
        />
        <Legend
          formatter={(value) => {
            const info = categoryInfo.find((c) => c.id === value);
            return info ? `${info.emoji} ${info.name}` : value;
          }}
          wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', paddingTop: 8 }}
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
