import { scopeFromCookie } from '@/lib/search/location-scope';

/** User's site-wide city selection (header location picker) for intake defaults. */
export function preferredCityFromScope(): {
  id: string;
  name: string;
} | null {
  if (typeof window === 'undefined') return null;

  const scope = scopeFromCookie();
  if (scope.mode === 'city' && scope.cities[0]) {
    return { id: scope.cities[0].id, name: scope.cities[0].name };
  }
  if (scope.mode === 'cities' && scope.cities.length === 1) {
    return { id: scope.cities[0].id, name: scope.cities[0].name };
  }
  return null;
}
