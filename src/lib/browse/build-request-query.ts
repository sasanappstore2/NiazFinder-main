import type { BrowseFilters } from '@/lib/filters/parser';
import { RANGE_PARAM_MAP } from '@/config/category-filters/attr-params';

/** Build `/api/requests` query string from browse filters. */
export function buildRequestListParams(
  filters: BrowseFilters | undefined,
  opts: {
    page: number;
    limit: number;
    search?: string;
    category?: string;
    cities?: string[];
    provinces?: string[];
    /** City slug/id for resolving neighborhood slugs on the server. */
    neighborhoodCity?: string;
    requestStatus?: string;
  }
): URLSearchParams {
  const params = new URLSearchParams();
  params.set('page', String(opts.page));
  params.set('limit', String(opts.limit));
  params.set('status', opts.requestStatus ?? 'OPEN');

  if (opts.search?.trim()) params.set('search', opts.search.trim());
  if (opts.category) params.set('category', opts.category);
  if (opts.cities?.length) params.set('cities', opts.cities.join(','));
  if (opts.provinces?.length) params.set('provinces', opts.provinces.join(','));

  if (!filters) return params;

  if (filters.provinces?.length) {
    params.set('provinces', filters.provinces.join(','));
  }

  if (filters.neighborhoods?.length) {
    params.set('neighborhoods', filters.neighborhoods.join(','));
    if (opts.neighborhoodCity) {
      params.set('neighborhoodCity', opts.neighborhoodCity);
    }
  }

  if (filters.priceMin != null) params.set('budgetMin', String(filters.priceMin));
  if (filters.priceMax != null) params.set('budgetMax', String(filters.priceMax));
  if (filters.urgent) params.set('priority', 'URGENT');
  if (filters.hasPhoto) params.set('has-photo', 'true');
  if (filters.recent) params.set('recent', filters.recent);
  if (filters.sort) params.set('sort', mapSortToRequestApi(filters.sort));

  for (const [key, val] of Object.entries(filters.attributes)) {
    if (!val) continue;
    let emitted = false;
    for (const [rangeParam, map] of Object.entries(RANGE_PARAM_MAP)) {
      if (key === map.minKey || key === map.maxKey) {
        const min = filters.attributes[map.minKey];
        const max = filters.attributes[map.maxKey];
        if (min || max) {
          params.set(rangeParam, `${min ?? ''}-${max ?? ''}`);
        }
        emitted = true;
        break;
      }
    }
    if (!emitted) params.set(key, val);
  }

  return params;
}

function mapSortToRequestApi(sort: BrowseFilters['sort']): string {
  switch (sort) {
    case 'price-asc':
      return 'budget_low';
    case 'price-desc':
      return 'budget_high';
    case 'oldest':
      return 'oldest';
    case 'popular':
      return 'most_proposals';
    default:
      return 'newest';
  }
}
