import { createHash } from 'crypto';
import type { BrowseFilters } from '@/lib/filters/parser';
import { serializeFilters } from '@/lib/filters/parser';

export function buildNeedBrowseAlertFingerprint(input: {
  browsePath: string;
  categorySlug?: string | null;
  citySlugs: string[];
  filters?: Partial<BrowseFilters>;
  searchQuery?: string | null;
}): string {
  const path = input.browsePath.replace(/\/$/, '') || '/';
  const qs = serializeFilters({
    ...input.filters,
    q: (input.searchQuery ?? input.filters?.q ?? null) || null,
    cities: input.citySlugs.length > 0 ? input.citySlugs : input.filters?.cities ?? [],
  }).toString();

  const raw = JSON.stringify({
    path,
    categorySlug: input.categorySlug ?? '',
    qs,
  });

  return createHash('sha256').update(raw).digest('hex').slice(0, 32);
}
