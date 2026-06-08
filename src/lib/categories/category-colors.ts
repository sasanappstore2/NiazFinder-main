import { getCategoryPath } from '@/config/categories';

/** Maps top-level category slugs to psychology-based hex colors. */
const CATEGORY_COLORS: Record<string, string> = {
  'real-estate': '#3b82f6',
  vehicles: '#ef4444',
  electronics: '#06b6d4',
  'home-appliances': '#f97316',
  services: '#8b5cf6',
  'personal-items': '#ec4899',
  entertainment: '#eab308',
  social: '#10b981',
  jobs: '#6366f1',
};

const DEFAULT_CATEGORY_COLOR = '#6b7280';

/** Resolves a need category slug to its top-level color. */
export function getCategoryColor(value: string | null | undefined): string {
  if (!value) return DEFAULT_CATEGORY_COLOR;
  if (CATEGORY_COLORS[value]) return CATEGORY_COLORS[value];

  const path = getCategoryPath(value);
  const root = path.find((c) => c.depth === 0) ?? path[0];
  if (!root) return DEFAULT_CATEGORY_COLOR;
  return CATEGORY_COLORS[root.slug] ?? DEFAULT_CATEGORY_COLOR;
}
