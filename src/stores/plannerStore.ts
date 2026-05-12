import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Types ────────────────────────────────────────────────────────────────────

export interface PlannerProfile {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface PlannerCategory {
  id: string;
  profileId: string;
  kind: 'primary' | 'secondary';
  name: string;
  color: string;
  order: number;
}

export interface PlannerAssignment {
  profileId: string;
  assetId: string; // ticker
  primaryCategoryId: string | null;
  secondaryCategoryId: string | null;
}

// ── Color palette for auto-assignment ───────────────────────────────────────

export const PLANNER_COLORS = [
  '#3B82F6', '#00E600', '#F59E0B', '#FF5555',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
  '#6366F1', '#84CC16', '#14B8A6', '#A855F7',
];

// ── Templates ────────────────────────────────────────────────────────────────

type TemplateKey = 'strategy' | 'risk' | 'income' | 'sector';

interface TemplateData {
  primary: Array<{ name: string; color: string }>;
  secondary: Array<{ name: string; color: string }>;
}

export const PROFILE_TEMPLATES: Record<TemplateKey, TemplateData> = {
  strategy: {
    primary: [
      { name: 'Growth',      color: '#3B82F6' },
      { name: 'Value',       color: '#00E600' },
      { name: 'Dividend',    color: '#F59E0B' },
      { name: 'Speculative', color: '#FF5555' },
    ],
    secondary: [
      { name: 'Technology', color: '#3B82F6' },
      { name: 'Healthcare', color: '#00E600' },
      { name: 'Financials', color: '#F59E0B' },
      { name: 'Consumer',   color: '#EC4899' },
      { name: 'Energy',     color: '#FF5555' },
      { name: 'Industrial', color: '#6B7280' },
    ],
  },
  risk: {
    primary: [
      { name: 'Core',          color: '#00E600' },
      { name: 'Moderate Risk', color: '#F59E0B' },
      { name: 'High Risk',     color: '#FF5555' },
    ],
    secondary: [
      { name: 'Large Cap',       color: '#3B82F6' },
      { name: 'Mid Cap',         color: '#8B5CF6' },
      { name: 'Small Cap',       color: '#EC4899' },
      { name: 'Emerging Markets',color: '#06B6D4' },
      { name: 'Crypto',          color: '#F97316' },
    ],
  },
  income: {
    primary: [
      { name: 'High Yield',      color: '#F59E0B' },
      { name: 'Dividend Growth', color: '#00E600' },
      { name: 'Fixed Income',    color: '#3B82F6' },
      { name: 'Growth',          color: '#8B5CF6' },
    ],
    secondary: [
      { name: 'Utilities',   color: '#EC4899' },
      { name: 'REITs',       color: '#06B6D4' },
      { name: 'Bonds',       color: '#6B7280' },
      { name: 'Preferreds',  color: '#F97316' },
      { name: 'Technology',  color: '#3B82F6' },
    ],
  },
  sector: {
    primary: [
      { name: 'Technology', color: '#3B82F6' },
      { name: 'Healthcare', color: '#00E600' },
      { name: 'Financials', color: '#F59E0B' },
      { name: 'Consumer',   color: '#EC4899' },
      { name: 'Energy',     color: '#FF5555' },
      { name: 'Other',      color: '#6B7280' },
    ],
    secondary: [
      { name: 'US',            color: '#3B82F6' },
      { name: 'International', color: '#8B5CF6' },
      { name: 'Emerging',      color: '#06B6D4' },
      { name: 'ETF',           color: '#F59E0B' },
    ],
  },
};

// ── Store ────────────────────────────────────────────────────────────────────

interface PlannerStore {
  profiles: PlannerProfile[];
  categories: PlannerCategory[];
  assignments: PlannerAssignment[];
  activeProfileId: string | null;

  // Profile CRUD
  createProfile: (name: string, template?: TemplateKey | 'blank', fromProfileId?: string) => string;
  updateProfile: (id: string, updates: { name?: string; description?: string }) => void;
  deleteProfile: (id: string) => void;
  setActiveProfile: (id: string | null) => void;

  // Category CRUD
  addCategory: (profileId: string, kind: 'primary' | 'secondary', name: string, color?: string) => string;
  updateCategory: (id: string, updates: { name?: string; color?: string }) => void;
  deleteCategory: (id: string) => void;

  // Assignments
  assignAsset: (
    profileId: string,
    assetId: string,
    primaryCategoryId: string | null,
    secondaryCategoryId?: string | null
  ) => void;
  removeAssignment: (profileId: string, assetId: string) => void;
}

export const usePlannerStore = create<PlannerStore>()(
  persist(
    (set, get) => ({
      profiles: [],
      categories: [],
      assignments: [],
      activeProfileId: null,

      createProfile: (name, template = 'blank', fromProfileId) => {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const newProfile: PlannerProfile = { id, name, createdAt: now };

        const state = get();
        let newCategories: PlannerCategory[] = [];
        let newAssignments: PlannerAssignment[] = [];

        if (template && template !== 'blank' && PROFILE_TEMPLATES[template as TemplateKey]) {
          const tmpl = PROFILE_TEMPLATES[template as TemplateKey];
          newCategories = [
            ...tmpl.primary.map((c, i) => ({
              id: crypto.randomUUID(), profileId: id, kind: 'primary' as const,
              name: c.name, color: c.color, order: i,
            })),
            ...tmpl.secondary.map((c, i) => ({
              id: crypto.randomUUID(), profileId: id, kind: 'secondary' as const,
              name: c.name, color: c.color, order: i,
            })),
          ];
        } else if (fromProfileId) {
          // Duplicate profile — copy categories and remap assignments
          const sourceCats = state.categories.filter(c => c.profileId === fromProfileId);
          const catIdMap = new Map<string, string>();
          newCategories = sourceCats.map(c => {
            const newId = crypto.randomUUID();
            catIdMap.set(c.id, newId);
            return { ...c, id: newId, profileId: id };
          });
          const sourceAssignments = state.assignments.filter(a => a.profileId === fromProfileId);
          newAssignments = sourceAssignments.map(a => ({
            ...a,
            profileId: id,
            primaryCategoryId: a.primaryCategoryId
              ? (catIdMap.get(a.primaryCategoryId) ?? a.primaryCategoryId)
              : null,
            secondaryCategoryId: a.secondaryCategoryId
              ? (catIdMap.get(a.secondaryCategoryId) ?? a.secondaryCategoryId)
              : null,
          }));
        }

        set(s => ({
          profiles: [...s.profiles, newProfile],
          categories: [...s.categories, ...newCategories],
          assignments: [...s.assignments, ...newAssignments],
          activeProfileId: s.activeProfileId ?? id,
        }));

        return id;
      },

      updateProfile: (id, updates) =>
        set(s => ({
          profiles: s.profiles.map(p => p.id === id ? { ...p, ...updates } : p),
        })),

      deleteProfile: (id) =>
        set(s => ({
          profiles: s.profiles.filter(p => p.id !== id),
          categories: s.categories.filter(c => c.profileId !== id),
          assignments: s.assignments.filter(a => a.profileId !== id),
          activeProfileId: s.activeProfileId === id
            ? (s.profiles.find(p => p.id !== id)?.id ?? null)
            : s.activeProfileId,
        })),

      setActiveProfile: (id) => set({ activeProfileId: id }),

      addCategory: (profileId, kind, name, color) => {
        const id = crypto.randomUUID();
        const state = get();
        const existingOrder = state.categories
          .filter(c => c.profileId === profileId && c.kind === kind)
          .length;
        const autoColor = color ?? PLANNER_COLORS[existingOrder % PLANNER_COLORS.length];
        set(s => ({
          categories: [...s.categories, {
            id, profileId, kind, name, color: autoColor, order: existingOrder,
          }],
        }));
        return id;
      },

      updateCategory: (id, updates) =>
        set(s => ({
          categories: s.categories.map(c => c.id === id ? { ...c, ...updates } : c),
        })),

      deleteCategory: (id) =>
        set(s => ({
          categories: s.categories.filter(c => c.id !== id),
          // Clear assignments that reference this category
          assignments: s.assignments.map(a => ({
            ...a,
            primaryCategoryId: a.primaryCategoryId === id ? null : a.primaryCategoryId,
            secondaryCategoryId: a.secondaryCategoryId === id ? null : a.secondaryCategoryId,
          })),
        })),

      assignAsset: (profileId, assetId, primaryCategoryId, secondaryCategoryId = null) =>
        set(s => {
          const existing = s.assignments.findIndex(
            a => a.profileId === profileId && a.assetId === assetId
          );
          if (existing >= 0) {
            const updated = [...s.assignments];
            updated[existing] = { profileId, assetId, primaryCategoryId, secondaryCategoryId };
            return { assignments: updated };
          }
          return {
            assignments: [...s.assignments, { profileId, assetId, primaryCategoryId, secondaryCategoryId }],
          };
        }),

      removeAssignment: (profileId, assetId) =>
        set(s => ({
          assignments: s.assignments.filter(
            a => !(a.profileId === profileId && a.assetId === assetId)
          ),
        })),
    }),
    { name: 'nw-planner', version: 1 }
  )
);
