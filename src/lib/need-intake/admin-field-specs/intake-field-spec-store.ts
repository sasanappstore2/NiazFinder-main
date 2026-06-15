import type { CategoryFilterField } from '@/config/category-filters/types';

/** Admin field spec store stub (training tooling removed). */
export function getActiveIntakeFieldOverrides(_categorySlug: string): CategoryFilterField[] {
  return [];
}

export async function loadIntakeFieldSpecStore(): Promise<Record<string, unknown>> {
  return {};
}
