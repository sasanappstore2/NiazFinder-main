import type { SortKey } from '@/lib/filters/parser';

/** Map canonical URL sort keys to API query sort params. */
export function mapSortToRequestApi(sort: SortKey): string {
  switch (sort) {
    case 'price-asc':
      return 'budget_low';
    case 'price-desc':
      return 'budget_high';
    case 'popular':
      return 'most_proposals';
    case 'oldest':
      return 'oldest';
    case 'newest':
    default:
      return 'newest';
  }
}

export function mapSortToBusinessApi(sort: SortKey): string {
  switch (sort) {
    case 'rating':
      return 'rating';
    case 'popular':
      return 'popular';
    case 'newest':
    default:
      return 'newest';
  }
}
