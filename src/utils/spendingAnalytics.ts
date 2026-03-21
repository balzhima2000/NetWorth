import type { Transaction } from '../types/index';

export interface MonthlyTotal {
  key: string;     // "2024-03"
  label: string;   // "Mar '24"
  year: number;
  month: number;
  expenses: number;
  income: number;
  savingsRate: number; // (income - expenses) / income * 100
}

export interface CategoryMonthData {
  key: string;
  label: string;
  [category: string]: number | string;
}

export interface DailyTotal {
  day: number;
  label: string;
  amount: number;
}

function makeKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function makeLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
  });
}

function getDistinctMonths(transactions: Transaction[]): { year: number; month: number }[] {
  const seen = new Set<string>();
  transactions.forEach((t) => {
    const d = new Date(t.date);
    seen.add(makeKey(d.getFullYear(), d.getMonth() + 1));
  });
  return [...seen]
    .sort()
    .map((k) => {
      const [y, m] = k.split('-').map(Number);
      return { year: y, month: m };
    });
}

/**
 * Returns total expenses and income per month across all transaction history.
 * The period selector in the UI slices this array — no data is discarded here.
 */
export function getMonthlyTotals(transactions: Transaction[]): MonthlyTotal[] {
  const months = getDistinctMonths(transactions);
  return months.map(({ year, month }) => {
    let expenses = 0;
    let income = 0;
    transactions.forEach((t) => {
      const d = new Date(t.date);
      if (d.getFullYear() === year && d.getMonth() + 1 === month) {
        if (t.type === 'expense') expenses += t.convertedAmount;
        else income += t.convertedAmount;
      }
    });
    const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
    return {
      key: makeKey(year, month),
      label: makeLabel(year, month),
      year,
      month,
      expenses,
      income,
      savingsRate,
    };
  });
}

/**
 * Returns per-category monthly spending for the top N expense categories (by all-time total).
 * Categories are sorted highest-to-lowest total spend.
 */
export function getCategoryTrends(
  transactions: Transaction[],
  topN = 5
): { months: CategoryMonthData[]; categories: string[] } {
  const expenseTxs = transactions.filter((t) => t.type === 'expense');

  // Determine top N categories by total all-time spend
  const totalByCategory: Record<string, number> = {};
  expenseTxs.forEach((t) => {
    totalByCategory[t.category] = (totalByCategory[t.category] ?? 0) + t.convertedAmount;
  });
  const categories = Object.entries(totalByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN)
    .map(([cat]) => cat);

  const months = getDistinctMonths(expenseTxs);
  const result: CategoryMonthData[] = months.map(({ year, month }) => {
    const entry: CategoryMonthData = {
      key: makeKey(year, month),
      label: makeLabel(year, month),
    };
    // Initialize all category keys to 0
    categories.forEach((cat) => {
      entry[cat] = 0;
    });
    expenseTxs.forEach((t) => {
      const d = new Date(t.date);
      if (
        d.getFullYear() === year &&
        d.getMonth() + 1 === month &&
        categories.includes(t.category)
      ) {
        entry[t.category] = ((entry[t.category] as number) ?? 0) + t.convertedAmount;
      }
    });
    return entry;
  });

  return { months: result, categories };
}

/**
 * Returns daily expense totals for a given month/year (all days 1–N, including zero-spend days).
 * Excludes auto-added recurring/installment transactions since those don't reflect
 * real daily spending patterns — they fire on a fixed schedule regardless of user behavior.
 */
export function getDailyTotals(
  transactions: Transaction[],
  month: number,
  year: number
): DailyTotal[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const result: DailyTotal[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const amount = transactions
      .filter((t) => {
        const d = new Date(t.date);
        return (
          t.type === 'expense' &&
          !t.isAutoAdded &&
          d.getFullYear() === year &&
          d.getMonth() + 1 === month &&
          d.getDate() === day
        );
      })
      .reduce((sum, t) => sum + t.convertedAmount, 0);
    result.push({ day, label: String(day), amount });
  }
  return result;
}
