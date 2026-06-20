import type { SiteImportSuggestion } from './types';

export const SITE_IMPORT_APPLY_ORDER: SiteImportSuggestion['apply']['type'][] = [
  'patch_profile',
  'patch_web_presence',
  'patch_extensions',
  'add_categories',
  'add_offers',
];

/** Filter accepted suggestions and sort for safe apply order (profile before offers). */
export function sortAcceptedSuggestions(
  suggestions: SiteImportSuggestion[],
  acceptedIds: string[]
): SiteImportSuggestion[] {
  const accepted = new Set(acceptedIds);
  return suggestions
    .filter((s) => accepted.has(s.id))
    .sort(
      (a, b) =>
        SITE_IMPORT_APPLY_ORDER.indexOf(a.apply.type) -
        SITE_IMPORT_APPLY_ORDER.indexOf(b.apply.type)
    );
}

export function isValidSiteImportSuggestion(value: unknown): value is SiteImportSuggestion {
  if (!value || typeof value !== 'object') return false;
  const s = value as SiteImportSuggestion;
  return (
    typeof s.id === 'string' &&
    typeof s.group === 'string' &&
    typeof s.labelFa === 'string' &&
    s.apply != null &&
    typeof s.apply.type === 'string' &&
    s.apply.payload != null &&
    typeof s.apply.payload === 'object'
  );
}
