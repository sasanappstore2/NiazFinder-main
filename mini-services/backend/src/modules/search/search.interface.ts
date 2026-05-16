export class SearchParams {
  query: string;
  type?: 'requests' | 'specialists' | 'all';
  city?: string;
  province?: string;
  categoryId?: string;
  minBudget?: number;
  maxBudget?: number;
  minRating?: number;
  sort?: 'relevance' | 'newest' | 'price_low' | 'price_high' | 'rating';
  page?: number;
  limit?: number;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SearchSuggestion {
  type: 'category' | 'city' | 'popular_search';
  text: string;
  slug?: string;
}

export interface PopularSearch {
  query: string;
  count: number;
}
