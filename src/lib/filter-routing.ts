import type { Category } from '@/lib/types';

type QueryValue = string | number | boolean | null | undefined;

export interface FlatFilterCategory {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  level: number;
}

export function cleanQueryValue(value: QueryValue) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export function readQueryValue(
  params: URLSearchParams,
  keys: string[],
  fallback = ''
) {
  for (const key of keys) {
    const value = cleanQueryValue(params.get(key));
    if (value) return value;
  }
  return fallback;
}

export function readPositivePage(params: URLSearchParams, fallback = 1) {
  const value = Number(params.get('page') || fallback);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function buildUrlWithQuery(
  pathname: string,
  values: Record<string, QueryValue>,
  defaults: Record<string, QueryValue> = {}
) {
  const params = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(values)) {
    const value = cleanQueryValue(rawValue);
    const defaultValue = cleanQueryValue(defaults[key]);

    if (!value || value === defaultValue || value === 'all') continue;
    params.set(key, value);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function replaceBrowserUrl(
  pathname: string,
  values: Record<string, QueryValue>,
  defaults: Record<string, QueryValue> = {}
) {
  if (typeof window === 'undefined') return;

  const nextUrl = buildUrlWithQuery(pathname, values, defaults);
  const currentUrl = `${window.location.pathname}${window.location.search}`;

  if (currentUrl !== nextUrl) {
    window.history.replaceState(null, '', nextUrl);
  }
}

export function getCategoryRouteValue(category: Pick<Category, 'id' | 'slug'> | FlatFilterCategory) {
  return category.slug || category.id;
}

export function flattenCategories(categories: Category[]): FlatFilterCategory[] {
  return categories.flatMap((category) => {
    const parent: FlatFilterCategory = {
      id: category.id,
      name: category.name,
      slug: category.slug,
      parentId: category.parentId,
      level: 0,
    };

    const children = (category.children ?? []).map((child) => ({
      id: child.id,
      name: child.name,
      slug: child.slug,
      parentId: category.id,
      level: 1,
    }));

    return [parent, ...children];
  });
}

export function findCategoryByRouteValue(
  categories: FlatFilterCategory[],
  value: string
) {
  return categories.find((category) => category.slug === value || category.id === value);
}
