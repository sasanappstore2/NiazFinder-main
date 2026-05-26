/**
 * Location URL helpers — re-exported from location-scope (single source of truth).
 */
export {
  buildUrlFromCitySelection,
  buildUrlFromLocationScope,
  citiesFromUrl,
  compressCitySelection,
  persistScopeToCookie,
  resolveLocationScope,
  scopeFromCookie,
  scopeFromUrl,
  selectionToScope,
  type LocationSelection,
  type LocationScope,
} from '@/lib/search/location-scope';
