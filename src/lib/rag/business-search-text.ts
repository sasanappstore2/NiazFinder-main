import { parseJsonArray } from '@/lib/business/json-fields';

export type BusinessSearchTextInput = {
  name: string;
  description?: string | null;
  city?: string | null;
  province?: string | null;
  address?: string | null;
  categorySlugs?: string | string[] | null;
  tags?: string | string[] | null;
  offerTitles?: string[];
  categoryNames?: string[];
};

/** Build a stable passage for business profile vector indexing (public fields only). */
export function buildBusinessProfileSearchText(row: BusinessSearchTextInput): string {
  const categorySlugs = Array.isArray(row.categorySlugs)
    ? row.categorySlugs
    : parseJsonArray<string>(row.categorySlugs ?? '[]');
  const tags = Array.isArray(row.tags) ? row.tags : parseJsonArray<string>(row.tags ?? '[]');

  return [
    row.name,
    row.description ?? '',
    (row.categoryNames ?? []).join(' '),
    categorySlugs.join(' '),
    (row.offerTitles ?? []).join(' '),
    tags.join(' '),
    [row.city, row.province, row.address].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join('\n')
    .trim();
}
