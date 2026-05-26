export interface NeedBrowseFilters {
  category?: string;
  categoryId?: string;
  city?: string;
  province?: string;
  search?: string;
  status?: string;
  budgetMin?: number;
  budgetMax?: number;
  sort?: 'newest' | 'oldest' | 'budget' | 'popular';
}

export interface BusinessBrowseFilters {
  category?: string;
  city?: string;
  search?: string;
  rating?: number;
  verified?: boolean;
  sort?: 'rating' | 'newest' | 'popular';
}

export function parseNeedBrowseFilters(
  searchParams: URLSearchParams
): NeedBrowseFilters {
  return {
    category: searchParams.get('category') ?? undefined,
    categoryId: searchParams.get('categoryId') ?? undefined,
    city: searchParams.get('city') ?? undefined,
    search: searchParams.get('search') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    sort: (searchParams.get('sort') as NeedBrowseFilters['sort']) ?? undefined,
  };
}

export function parseBusinessBrowseFilters(
  searchParams: URLSearchParams
): BusinessBrowseFilters {
  return {
    category: searchParams.get('category') ?? undefined,
    city: searchParams.get('city') ?? undefined,
    search: searchParams.get('search') ?? undefined,
    sort: (searchParams.get('sort') as BusinessBrowseFilters['sort']) ?? undefined,
  };
}
