import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SpendingCategory } from '../types/index';

const DEFAULT_CATEGORIES: SpendingCategory[] = [
  // Expense categories
  { id: 'food', name: 'Food & Dining', emoji: '🍽️', color: '#f59e0b', isDefault: true, type: 'expense' },
  { id: 'transport', name: 'Transport', emoji: '🚗', color: '#3b82f6', isDefault: true, type: 'expense' },
  { id: 'housing', name: 'Housing', emoji: '🏠', color: '#8b5cf6', isDefault: true, type: 'expense' },
  { id: 'health', name: 'Health', emoji: '💊', color: '#ef4444', isDefault: true, type: 'expense' },
  { id: 'entertainment', name: 'Entertainment', emoji: '🎬', color: '#ec4899', isDefault: true, type: 'expense' },
  { id: 'shopping', name: 'Shopping', emoji: '🛍️', color: '#06b6d4', isDefault: true, type: 'expense' },
  { id: 'subscriptions', name: 'Subscriptions', emoji: '📱', color: '#10b981', isDefault: true, type: 'expense' },
  { id: 'education', name: 'Education', emoji: '📚', color: '#f97316', isDefault: true, type: 'expense' },
  // Income categories
  { id: 'salary', name: 'Salary', emoji: '💼', color: '#00d632', isDefault: true, type: 'income' },
  { id: 'freelance', name: 'Freelance', emoji: '🧑‍💻', color: '#00d632', isDefault: true, type: 'income' },
  { id: 'investment', name: 'Dividends & Investments', emoji: '📈', color: '#00d632', isDefault: true, type: 'income' },
  { id: 'rental', name: 'Rental Income', emoji: '🏘️', color: '#00d632', isDefault: true, type: 'income' },
  { id: 'bonus', name: 'Bonus', emoji: '🎯', color: '#00d632', isDefault: true, type: 'income' },
  { id: 'gift', name: 'Gift', emoji: '🎁', color: '#00d632', isDefault: true, type: 'income' },
  { id: 'business', name: 'Business Income', emoji: '🏢', color: '#00d632', isDefault: true, type: 'income' },
  // Both
  { id: 'other', name: 'Other', emoji: '💰', color: '#6b7280', isDefault: true, type: 'both' },
];

interface CategoriesStore {
  categories: SpendingCategory[];
  addCategory: (category: SpendingCategory) => void;
  updateCategory: (id: string, updates: Partial<SpendingCategory>) => void;
  deleteCategory: (id: string) => void;
}

export const useCategoriesStore = create<CategoriesStore>()(
  persist(
    (set) => ({
      categories: DEFAULT_CATEGORIES,
      addCategory: (category) =>
        set((state) => ({ categories: [...state.categories, category] })),
      updateCategory: (id, updates) =>
        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
      deleteCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== id),
        })),
    }),
    { name: 'nw-categories' }
  )
);
