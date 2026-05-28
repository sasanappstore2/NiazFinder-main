import { CANONICAL_CATEGORIES } from '@/config/categories';
import type { DatasetFixture } from '@/lib/need-intake/dataset/schema';

export interface CategoryCoverageRow {
  slug: string;
  title: string;
  depth: number;
  caseCount: number;
}

export function buildCategoryCoverage(fixtures: DatasetFixture[]): CategoryCoverageRow[] {
  const counts = new Map<string, number>();
  for (const f of fixtures) {
    const slugs = [
      f.labels.categorySlug,
      f.labels.subcategorySlug,
      f.expectCategoryIncludes,
    ].filter(Boolean) as string[];
    for (const s of slugs) {
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    const parsed = f.expectCategoryIncludes;
    if (parsed) counts.set(parsed, (counts.get(parsed) ?? 0) + 1);
  }

  return CANONICAL_CATEGORIES.filter((c) => c.depth >= 1).map((c) => ({
    slug: c.slug,
    title: c.title,
    depth: c.depth,
    caseCount: counts.get(c.slug) ?? 0,
  }));
}

export function uncoveredLeafSlugs(fixtures: DatasetFixture[]): string[] {
  const coverage = buildCategoryCoverage(fixtures);
  return coverage.filter((c) => c.depth === 2 && c.caseCount === 0).map((c) => c.slug);
}
